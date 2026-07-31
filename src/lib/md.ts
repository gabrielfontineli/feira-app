import { DEFAULT_CFG } from './cfg';
import { checkKey } from './checks';
import { MESES } from './dic';
import { brl0, brl2, norm, toNum } from './format';
import { byCategory } from './group';
import { matchDic } from './match';
import { itemFromDic, itemFromLine, naLista, qtyPorIda } from './quantity';
import type { Cfg, Checks, Freq, Item, PriceBase, PriceEntry } from './types';

/*
 * A lista como Markdown, de ida e de volta.
 *
 * Um formato só serve aos três usos — backup legível, lista da ida e entrada de
 * itens — porque o parser é tolerante: só o nome é obrigatório, e todo campo
 * depois dele é reconhecido pela forma, em qualquer ordem. É isso que faz um
 * arquivo de dieta ("um ingrediente por linha") e um backup completo passarem
 * pela mesma função.
 *
 * O que o .md **não** carrega, e por isso não substitui o .json: o histórico de
 * meses passados e o `Pago.prev`, que é o que permite corrigir um preço
 * digitado errado sem estragar a média. Preço de base sai arredondado ao
 * centavo, porque o arquivo é pra ler.
 */

const CABECALHO = '<!-- feira md v1 -->';
const SEP = ' · ';

/** Número como se escreve: 1.25 -> '1,25', 3 -> '3'. */
const q = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const SEC_AJUSTES = 'ajustes';
const SEC_PRECOS = 'precos aprendidos';

const chave = (s: string): string => norm(s).trim();

const FREQ_MD: Record<Freq, string> = { mes: 'mês', quinzena: 'quinzena', semana: 'semana' };
const FREQ_DE: Record<string, Freq> = { mes: 'mes', quinzena: 'quinzena', semana: 'semana' };

export interface MdSource {
  cfg: Cfg;
  itens: Item[];
  base: PriceBase;
  /** Marcações do mês aberto. */
  checks: Checks;
  /** Mês aberto, 'AAAA-MM'. */
  mes: string;
}

export interface MdDoc {
  /** Só as chaves que o arquivo trouxe. Quem confere é o `toCfg`. */
  cfg?: Partial<Cfg>;
  itens: Item[];
  base?: PriceBase;
  checks: Checks;
}

/* ---------------------------------------------------------------- escrever */

/**
 * Campos de um item, na ordem em que ficam legíveis. `cru` só aparece quando o
 * dicionário discorda: sem ele, um item que o DIC cozinha e o usuário desligou
 * voltaria cozinhando, e a quantidade de compra mudaria sozinha na importação.
 */
function campos(i: Item): string[] {
  const out = [q(i.qty) + ' ' + i.unit, FREQ_MD[i.freq]];
  if (i.cook) out.push(i.loss === undefined ? 'cozinha' : 'cozinha ' + q(i.loss) + '%');
  else if (matchDic(i.name)?.cook) out.push('cru');
  if (i.price) out.push('R$ ' + brl2(i.price));
  if (i.soHoje) out.push('avulso ' + i.soHoje);
  if (!i.on) out.push('desligado');
  if (i.nota) out.push(i.nota);
  return out;
}

function ajustes(cfg: Cfg): string {
  const sn = (v: number) => (v ? 'sim' : 'não');
  return [
    '## ' + SEC_AJUSTES,
    '- pessoas: ' + cfg.pessoas,
    '- dias: ' + cfg.dias,
    '- perda ao cozinhar: ' + q(cfg.loss) + '%',
    '- orçamento: ' + brl0(cfg.vale),
    '- limpeza: ' + sn(cfg.limpeza),
    '- higiene: ' + sn(cfg.higiene),
    '- extras: ' + sn(cfg.extras),
  ].join('\n');
}

function precos(base: PriceBase): string {
  const linhas = Object.entries(base).map(([nome, e]) => {
    const f = ['R$ ' + brl2(e.price) + ' / ' + e.unit];
    if (e.lastSeen) f.push(e.lastSeen);
    f.push(e.n === 1 ? '1 nota' : e.n + ' notas');
    return '- ' + nome + ': ' + f.join(SEP);
  });
  return ['## ' + SEC_PRECOS, ...linhas].join('\n');
}

/**
 * `'lista'` é o que se leva pro mercado ou pro Obsidian: só o que está na lista
 * do mês. `'tudo'` é o backup legível, com ajustes, itens desligados e preços.
 */
export function toMd(src: MdSource, escopo: 'tudo' | 'lista'): string {
  const [ano, mes] = src.mes.split('-');
  const titulo = '# feira · ' + MESES[Number(mes) - 1] + ' ' + ano;
  const itens = escopo === 'tudo' ? src.itens : src.itens.filter((i) => naLista(i, src.mes));

  const blocos = [titulo, CABECALHO];
  if (escopo === 'tudo') blocos.push(ajustes(src.cfg));

  for (const [cat, list] of byCategory(itens)) {
    const linhas = list.map(
      (i) => '- [' + (src.checks[checkKey(i)] ? 'x' : ' ') + '] ' + i.name + SEP + campos(i).join(SEP),
    );
    blocos.push(['## ' + cat, ...linhas].join('\n'));
  }

  if (escopo === 'tudo' && Object.keys(src.base).length) blocos.push(precos(src.base));
  return blocos.join('\n\n') + '\n';
}

/* -------------------------------------------------------------------- ler */

/** `- [x] `, `- `, `* `, `1. ` ou nada. O colchete diz se já foi comprado. */
const MARCADOR = /^\s*(?:[-*•]|\d+[.)])?\s*(?:\[([ xX])\]\s*)?/;

const F_PRECO = /^R\$\s*(.+)$/i;
const F_COZINHA = /^cozinha(?:\s+([\d.,]+)\s*%)?$/i;
const F_CRU = /^cru$/i;
const F_HOJE = /^hoje$/i;
const F_AVULSO = /^avulso\s+(\d{4}-\d{2})$/i;
const F_DESLIGADO = /^desligado$/i;
/** Quantidade e unidade: um número e uma palavra só. */
const F_QTY = /^(\S+)\s+(\S+)$/;

interface Campos {
  qty?: number;
  unit?: string;
  freq?: Freq;
  cook?: boolean;
  loss?: number;
  price?: number;
  soHoje?: string;
  on?: boolean;
  nota: string[];
}

function lerCampos(partes: string[], mes: string): Campos {
  const c: Campos = { nota: [] };
  for (const raw of partes) {
    const p = raw.trim();
    if (!p) continue;

    const freq = FREQ_DE[chave(p)];
    if (freq) {
      c.freq = freq;
      continue;
    }
    const cook = F_COZINHA.exec(p);
    if (cook) {
      c.cook = true;
      if (cook[1]) c.loss = toNum(cook[1]);
      continue;
    }
    if (F_CRU.test(p)) {
      c.cook = false;
      continue;
    }
    const preco = F_PRECO.exec(p);
    if (preco && Number.isFinite(toNum(preco[1]))) {
      c.price = toNum(preco[1]);
      continue;
    }
    if (F_HOJE.test(p)) {
      c.soHoje = mes;
      continue;
    }
    const avulso = F_AVULSO.exec(p);
    if (avulso) {
      c.soHoje = avulso[1];
      continue;
    }
    if (F_DESLIGADO.test(p)) {
      c.on = false;
      continue;
    }
    // Quantidade só uma vez: a segunda coisa com cara de '2 sacos' é nota.
    const qt = c.qty === undefined ? F_QTY.exec(p) : null;
    if (qt && Number.isFinite(toNum(qt[1]))) {
      c.qty = toNum(qt[1]);
      c.unit = qt[2];
      continue;
    }
    c.nota.push(p);
  }
  return c;
}

/**
 * Item da linha. O que o arquivo não disser vem do dicionário — é isso que faz
 * um documento de nomes soltos (a lista da dieta) virar item completo pelo
 * mesmo caminho. O nome escrito ganha do nome do dicionário: quem digitou
 * 'Bananinha da feira' quis esse nome.
 */
function lerItem(nome: string, partes: string[], cat: string, cfg: Cfg, mes: string): Item {
  const e = matchDic(nome);
  const it = e ? itemFromDic(e, cfg, {}, nome) : itemFromLine(nome, {});
  const c = lerCampos(partes, mes);

  if (cat) it.cat = cat;
  if (c.qty !== undefined) it.qty = c.qty;
  if (c.unit) it.unit = c.unit;
  if (c.freq) it.freq = c.freq;
  // `cozinha` sem porcentagem quer dizer "perda a do cfg", e precisa apagar a
  // perda que o dicionário trouxe: o exemplo cozinha a tilápia pelos 25% do
  // cfg, e herdar os 18% do DIC mudava quanto comprar na ida e volta.
  if (c.cook !== undefined) {
    it.cook = c.cook;
    it.loss = c.cook ? c.loss : undefined;
  }
  if (c.price !== undefined) it.price = c.price;
  if (c.soHoje) it.soHoje = c.soHoje;
  if (c.on === false) it.on = false;
  if (c.nota.length) it.nota = c.nota.join(SEP);
  return it;
}

/** `- pessoas: 3` -> ['pessoas', '3']. Devolve null pra linha sem `:`. */
function parDeLinha(linha: string): [string, string] | null {
  const t = linha.replace(MARCADOR, '');
  const i = t.indexOf(':');
  return i < 0 ? null : [t.slice(0, i).trim(), t.slice(i + 1).trim()];
}

function lerAjustes(linhas: string[]): Partial<Cfg> {
  const out: Partial<Cfg> = {};
  const numero = (v: string) => toNum(v.replace(/R\$|%/gi, '').trim());
  const sim = (v: string) => (chave(v) === 'nao' || chave(v) === '0' ? 0 : 1);
  for (const l of linhas) {
    const par = parDeLinha(l);
    if (!par) continue;
    const [rotulo, valor] = par;
    const k = chave(rotulo);
    const n = numero(valor);
    if (k === 'pessoas' && Number.isFinite(n)) out.pessoas = n;
    else if (k === 'dias' && Number.isFinite(n)) out.dias = n;
    else if (k.startsWith('perda') && Number.isFinite(n)) out.loss = n;
    else if (k.startsWith('orcamento') && Number.isFinite(n)) out.vale = n;
    else if (k === 'limpeza') out.limpeza = sim(valor);
    else if (k === 'higiene') out.higiene = sim(valor);
    else if (k === 'extras') out.extras = sim(valor);
  }
  return out;
}

function lerPrecos(linhas: string[]): PriceBase {
  const base: PriceBase = {};
  for (const l of linhas) {
    const par = parDeLinha(l);
    if (!par) continue;
    const [nome, resto] = par;
    const [primeiro, ...extras] = resto.split(SEP).map((s) => s.trim());
    const m = /^R\$\s*(.+?)\s*\/\s*(.+)$/i.exec(primeiro);
    if (!nome || !m) continue;
    const price = toNum(m[1]);
    if (!Number.isFinite(price)) continue;
    const e: PriceEntry = { price, unit: m[2], n: 0 };
    for (const x of extras) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(x)) e.lastSeen = x;
      else if (/^\d+\s+notas?$/i.test(x)) e.n = parseInt(x, 10);
    }
    base[nome] = e;
  }
  return base;
}

/**
 * Lê o documento. `mes` ('AAAA-MM') é o mês em que o arquivo está entrando: é
 * ele que dá sentido a um `hoje` escrito à mão. `cfg` só serve pra calcular a
 * quantidade sugerida de um item que veio sem quantidade.
 */
export function fromMd(text: string, mes: string, cfg: Cfg = DEFAULT_CFG): MdDoc {
  const linhas = text.split(/\r?\n/);
  const ajustesRaw: string[] = [];
  const precosRaw: string[] = [];
  const itensRaw: { nome: string; partes: string[]; cat: string; feito: boolean }[] = [];
  let cat = '';
  let secao: 'itens' | 'ajustes' | 'precos' = 'itens';

  for (const raw of linhas) {
    const l = raw.trim();
    if (!l || l.startsWith('<!--')) continue;
    if (l.startsWith('##')) {
      const nome = l.replace(/^#+\s*/, '').trim();
      const k = chave(nome);
      secao = k === SEC_AJUSTES ? 'ajustes' : k === SEC_PRECOS ? 'precos' : 'itens';
      cat = secao === 'itens' ? nome : '';
      continue;
    }
    // Título do documento. Só o `#` de um nível é descartado; `##` já saiu.
    if (l.startsWith('#')) continue;
    if (secao === 'ajustes') {
      ajustesRaw.push(l);
      continue;
    }
    if (secao === 'precos') {
      precosRaw.push(l);
      continue;
    }
    const m = MARCADOR.exec(l);
    const corpo = l.slice(m ? m[0].length : 0).trim();
    if (!corpo) continue;
    const [nome, ...partes] = corpo.split(SEP);
    if (!nome.trim()) continue;
    itensRaw.push({ nome: nome.trim(), partes, cat, feito: (m?.[1] ?? ' ').toLowerCase() === 'x' });
  }

  const doc: MdDoc = { itens: [], checks: {} };
  if (ajustesRaw.length) doc.cfg = lerAjustes(ajustesRaw);
  if (precosRaw.length) doc.base = lerPrecos(precosRaw);

  const efetivo: Cfg = doc.cfg ? { ...cfg, ...doc.cfg } : cfg;
  for (const r of itensRaw) {
    const it = lerItem(r.nome, r.partes, r.cat, efetivo, mes);
    doc.itens.push(it);
    if (r.feito) doc.checks[checkKey(it)] = true;
  }
  return doc;
}

/* ------------------------------------------------------------- pra colar */

/**
 * O texto de colar nos Lembretes do iPhone: só o que falta comprar, um item por
 * linha, sem colchete e sem cabeçalho de categoria. Colchete entraria literal
 * no lembrete, e a lista tipo "Compras" do iOS categoriza melhor sozinha do que
 * respeitando um `CATORDER` colado.
 *
 * A quantidade é a da ida, em peso cru — é o que vai no carrinho. Quem chama
 * passa a lista já filtrada pelo mês (o `on` derivado da tela da lista).
 */
export function toPlainText(itens: Item[], checks: Checks, cfg: Cfg): string {
  return itens
    .filter((i) => !checks[checkKey(i)])
    .map((i) => i.name + ' ' + q(qtyPorIda(i, cfg)) + ' ' + i.unit)
    .join('\n');
}
