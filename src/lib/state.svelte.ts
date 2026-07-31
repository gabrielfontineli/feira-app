import { DEFAULT_CFG, toCfg } from './cfg';
import { checkKey, remapChecks } from './checks';
import { registrarPago, type PriceConflict } from './prices';
import { naLista } from './quantity';
import { allKeys, ddel, dget, dset } from './storage';
import type { Backup, Cfg, Checks, Item, Pagos, PriceBase } from './types';

const K_CFG = 'cfg';
const K_ITENS = 'itens';
const K_BASE = 'base';
const K_VER = 'ver';

/** 2: marcações passaram a ser chaveadas pelo slug do nome, não pelo id. */
const VERSION = 2;

export { DEFAULT_CFG, toCfg };

const CHECK = 'check:';
const PAGO = 'pago:';

const monthKey = (pfx: string, y: number, m: number) =>
  pfx + y + '-' + String(m + 1).padStart(2, '0');

class Feira {
  cfg = $state<Cfg>({ ...DEFAULT_CFG });
  itens = $state<Item[]>([]);
  base = $state<PriceBase>({});
  /** Marcações do mês aberto. Os outros meses ficam no storage. */
  checks = $state<Checks>({});
  /** Preços digitados na lista no mês aberto. Mesma chave das marcações. */
  pagos = $state<Pagos>({});
  ym = $state({ y: new Date().getFullYear(), m: new Date().getMonth() });
  /** Falso até o storage terminar de carregar, pra não salvar em cima. */
  ready = $state(false);

  readonly key = $derived(monthKey(CHECK, this.ym.y, this.ym.m));
  readonly keyPago = $derived(monthKey(PAGO, this.ym.y, this.ym.m));
  /** Mês aberto como 'AAAA-MM'. É o que prende um avulso — ver `Item.soHoje`. */
  readonly mes = $derived(this.key.slice(CHECK.length));

  async load() {
    const c = await dget<Partial<Cfg>>(K_CFG);
    if (c) this.cfg = toCfg({ ...DEFAULT_CFG, ...c });
    const i = await dget<Item[]>(K_ITENS);
    if (Array.isArray(i)) this.itens = i;
    const b = await dget<PriceBase>(K_BASE);
    if (b) this.base = b;
    await this.migrate();
    await this.loadChecks();
    this.ready = true;
  }

  /**
   * Reescreve as marcações já guardadas na chave estável. Roda uma vez: os ids
   * aleatórios só existem no que foi salvo antes desta versão, e depois da
   * conversão não há mais de onde tirar o mapa id -> nome.
   */
  private async migrate() {
    if ((await dget<number>(K_VER)) === VERSION) return;
    for (const k of allKeys(CHECK)) {
      const old = await dget<Checks>(k);
      if (old && Object.keys(old).length) await dset(k, remapChecks(old, this.itens));
    }
    await dset(K_VER, VERSION);
  }

  async loadChecks() {
    this.checks = (await dget<Checks>(this.key)) || {};
    this.pagos = (await dget<Pagos>(this.keyPago)) || {};
  }

  async goMonth(d: number) {
    const y = this.ym.y;
    const m = this.ym.m + d;
    const dt = new Date(y, m, 1);
    this.ym = { y: dt.getFullYear(), m: dt.getMonth() };
    await this.loadChecks();
  }

  async today() {
    const now = new Date();
    this.ym = { y: now.getFullYear(), m: now.getMonth() };
    await this.loadChecks();
  }

  /** Marcado? Chaveado pelo slug do nome, não pelo id — ver checks.ts. */
  isChecked(it: Item): boolean {
    return !!this.checks[checkKey(it)];
  }

  toggle(it: Item) {
    const k = checkKey(it);
    this.checks[k] = !this.checks[k];
    void dset(this.key, this.checks);
  }

  /** Entra na lista. `soHoje` prende o item ao mês aberto e só a ele. */
  adicionar(it: Item, soHoje = false) {
    if (soHoje) it.soHoje = this.mes;
    this.itens.unshift(it);
  }

  /** Item que a lista deste mês mostra: ligado, e não é avulso de outro mês. */
  naLista(it: Item): boolean {
    return naLista(it, this.mes);
  }

  /**
   * Guarda o preço unitário digitado ao riscar o item. Devolve o conflito de
   * unidade em vez de aplicar, igual ao caminho da nota fiscal.
   */
  registrarPreco(it: Item, obs: number): PriceConflict | null {
    const k = checkKey(it);
    const antes = this.pagos[k];
    const r = registrarPago(this.base, this.pagos, k, it.name, obs, it.unit);
    if (r.conflito) return r.conflito;
    this.base = r.base;
    const novo = r.pagos[k];
    if (novo) novo.prevPrice = antes ? antes.prevPrice : it.price;
    // O preço do item segue a base. Quando apagar o campo não deixa entrada na
    // base, volta o que o item mostrava antes — ver `Pago.prevPrice`.
    const e = r.base[it.name];
    it.price = e ? Math.round(e.price * 100) / 100 : (antes?.prevPrice ?? it.price);
    this.pagos = r.pagos;
    void dset(this.keyPago, this.pagos);
    return null;
  }

  async resetMonth() {
    this.checks = {};
    this.pagos = {};
    await ddel(this.key);
    await ddel(this.keyPago);
  }

  /**
   * Um registro por mês guardado — o backup levava só o mês aberto. Serve pras
   * marcações e pros preços digitados, que têm o mesmo formato de chave.
   */
  private async everyMonth<T extends object>(
    pfx: string,
    key: string,
    atual: T,
  ): Promise<Record<string, T>> {
    const out: Record<string, T> = {};
    for (const k of allKeys(pfx)) {
      const v = k === key ? atual : await dget<T>(k);
      if (v && Object.keys(v).length) out[k] = v;
    }
    if (Object.keys(atual).length) out[key] = atual;
    return out;
  }

  everyMonthChecks(): Promise<Record<string, Checks>> {
    return this.everyMonth(CHECK, this.key, this.checks);
  }

  async backup(): Promise<Backup> {
    return {
      app: 'feira',
      v: 1,
      exportado: new Date().toISOString(),
      cfg: this.cfg,
      itens: this.itens,
      base: this.base,
      checks: await this.everyMonthChecks(),
      pagos: await this.everyMonth(PAGO, this.keyPago, this.pagos),
    };
  }

  /** Restaura um backup. Lança se o arquivo não tiver a cara de um. */
  async restore(raw: unknown) {
    const d = raw as Partial<Backup>;
    if (!d || !Array.isArray(d.itens)) throw new Error('formato');
    this.cfg = toCfg({ ...DEFAULT_CFG, ...(d.cfg || {}) });
    this.itens = d.itens;
    this.base = d.base || {};
    if (d.checks && typeof d.checks === 'object') {
      for (const [k, v] of Object.entries(d.checks)) {
        if (/^check:\d{4}-\d{2}$/.test(k) && v) await dset(k, v);
      }
    }
    // Backup exportado antes dos preços na lista não traz `pagos`: sem eles o
    // app só perde a chance de desfazer uma digitação de mês passado.
    if (d.pagos && typeof d.pagos === 'object') {
      for (const [k, v] of Object.entries(d.pagos)) {
        if (/^pago:\d{4}-\d{2}$/.test(k) && v) await dset(k, v);
      }
    }
    this.cfg.started = 1;
    // O backup pode ter sido exportado antes da chave estável.
    await dset(K_VER, 0);
    await this.migrate();
    await this.loadChecks();
    this.persistNow();
  }

  async nuke() {
    for (const k of [...allKeys(CHECK), ...allKeys(PAGO)]) await ddel(k);
    await ddel(K_CFG);
    await ddel(K_ITENS);
    await ddel(K_BASE);
    await ddel(K_VER);
    this.cfg = { ...DEFAULT_CFG };
    this.itens = [];
    this.base = {};
    this.checks = {};
    this.pagos = {};
  }

  persistNow() {
    void dset(K_CFG, this.cfg);
    void dset(K_ITENS, this.itens);
    void dset(K_BASE, this.base);
  }
}

export const feira = new Feira();

/* Salva sozinho, com os mesmos 300 ms de folga do app antigo. O JSON.stringify
   serve pra ler o estado inteiro em profundidade e assim registrar a
   dependência — sem ele, mudar o preço de um item não dispararia o efeito. */
$effect.root(() => {
  let tmr: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    JSON.stringify([feira.cfg, feira.itens, feira.base]);
    if (!feira.ready) return;
    clearTimeout(tmr);
    tmr = setTimeout(() => feira.persistNow(), 300);
  });
});
