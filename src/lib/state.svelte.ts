import { allCheckKeys, ddel, dget, dset } from './storage';
import type { Backup, Cfg, Checks, Item, PriceBase } from './types';

const K_CFG = 'cfg';
const K_ITENS = 'itens';
const K_BASE = 'base';

export const DEFAULT_CFG: Cfg = {
  pessoas: 2,
  dias: 30,
  loss: 25,
  vale: 0,
  limpeza: 1,
  higiene: 1,
  extras: 0,
  started: 0,
};

const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Confere os ajustes que vêm de fora (backup, storage antigo). Antes o app
 * fazia Object.assign às cegas, e um `pessoas` inválido espalhava NaN por
 * todas as quantidades sugeridas.
 */
export function toCfg(raw: unknown): Cfg {
  const r = (raw ?? {}) as Partial<Record<keyof Cfg, unknown>>;
  return {
    pessoas: Math.max(1, num(r.pessoas, DEFAULT_CFG.pessoas)),
    dias: Math.min(31, Math.max(1, num(r.dias, DEFAULT_CFG.dias))),
    loss: Math.min(90, Math.max(0, num(r.loss, DEFAULT_CFG.loss))),
    vale: Math.max(0, num(r.vale, DEFAULT_CFG.vale)),
    limpeza: r.limpeza ? 1 : 0,
    higiene: r.higiene ? 1 : 0,
    extras: r.extras ? 1 : 0,
    started: r.started ? 1 : 0,
  };
}

const monthKey = (y: number, m: number) => 'check:' + y + '-' + String(m + 1).padStart(2, '0');

class Feira {
  cfg = $state<Cfg>({ ...DEFAULT_CFG });
  itens = $state<Item[]>([]);
  base = $state<PriceBase>({});
  /** Marcações do mês aberto. Os outros meses ficam no storage. */
  checks = $state<Checks>({});
  ym = $state({ y: new Date().getFullYear(), m: new Date().getMonth() });
  /** Falso até o storage terminar de carregar, pra não salvar em cima. */
  ready = $state(false);

  readonly key = $derived(monthKey(this.ym.y, this.ym.m));

  async load() {
    const c = await dget<Partial<Cfg>>(K_CFG);
    if (c) this.cfg = toCfg({ ...DEFAULT_CFG, ...c });
    const i = await dget<Item[]>(K_ITENS);
    if (Array.isArray(i)) this.itens = i;
    const b = await dget<PriceBase>(K_BASE);
    if (b) this.base = b;
    await this.loadChecks();
    this.ready = true;
  }

  async loadChecks() {
    this.checks = (await dget<Checks>(this.key)) || {};
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

  toggle(id: string) {
    this.checks[id] = !this.checks[id];
    void dset(this.key, this.checks);
  }

  async resetMonth() {
    this.checks = {};
    await ddel(this.key);
  }

  /** Marcações de todos os meses guardados — o backup levava só o mês aberto. */
  async everyMonthChecks(): Promise<Record<string, Checks>> {
    const out: Record<string, Checks> = {};
    for (const k of allCheckKeys()) {
      const v = k === this.key ? this.checks : await dget<Checks>(k);
      if (v && Object.keys(v).length) out[k] = v;
    }
    if (Object.keys(this.checks).length) out[this.key] = this.checks;
    return out;
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
    this.cfg.started = 1;
    await this.loadChecks();
    this.persistNow();
  }

  async nuke() {
    for (const k of allCheckKeys()) await ddel(k);
    await ddel(K_CFG);
    await ddel(K_ITENS);
    await ddel(K_BASE);
    this.cfg = { ...DEFAULT_CFG };
    this.itens = [];
    this.base = {};
    this.checks = {};
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
