import { prettify } from './format';
import { matchDic } from './match';
import type { DicEntry, NFRow, PriceBase, PriceEntry } from './types';

/**
 * Peso do preço novo na média exponencial. Com 0,3 um aumento real chega em
 * ~80% do valor novo em cinco notas, em vez de nunca.
 */
export const ALPHA = 0.3;

/** Dias sem ver o item na nota antes de o preço virar suspeito no orçamento. */
export const STALE_DIAS = 120;

export interface LearnedPrice {
  name: string;
  entry: DicEntry | null;
  price: number;
}

/** Preço que a nota trouxe numa unidade incompatível com a que está guardada. */
export interface PriceConflict {
  name: string;
  /** Unidade que veio na nota. */
  unit: string;
  /** Preço unitário que veio na nota. */
  price: number;
  /** Unidade já guardada, ou null quando a própria nota traz as duas. */
  unitAtual: string | null;
}

export interface LearnResult {
  base: PriceBase;
  /** Nomes que ainda não tinham preço. */
  novos: number;
  /** Nomes cujo preço foi recalibrado. */
  recal: number;
  learned: LearnedPrice[];
  /** Nada foi aprendido destes: precisam de confirmação na tela. */
  conflitos: PriceConflict[];
}

/**
 * Peso ou peça. É a mistura que estraga a média: R$ 42,49 o quilo e R$ 17,00 a
 * peça não são o mesmo número. Já bandeja, caixa e pacote são todos peça, e
 * comparar 'bandeja' com 'cx' só geraria alarme falso.
 */
const bucket = (u: string): 'kg' | 'un' => (/^(kg|g)$/i.test(u) ? 'kg' : 'un');

export const hoje = (): string => new Date().toISOString().slice(0, 10);

/** Dias desde a última nota que trouxe este item, ou null se nunca soubemos. */
export function diasDesde(e: PriceEntry, ref = hoje()): number | null {
  if (!e.lastSeen) return null;
  const d = (Date.parse(ref) - Date.parse(e.lastSeen)) / 86400000;
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null;
}

/** Preço velho demais pra confiar no orçamento. Base antiga não sabe: false. */
export function isStale(e: PriceEntry, ref = hoje()): boolean {
  const d = diasDesde(e, ref);
  return d !== null && d > STALE_DIAS;
}

/**
 * Transforma linhas de nota em preços de referência.
 *
 * Duas contas, uma dentro da nota e outra entre notas:
 *
 * 1. dentro da nota, o preço observado é a média das linhas do mesmo item
 *    **ponderada pela quantidade** — 0,5 kg a 40 com 2 kg a 44 é 43,20, que é
 *    o que foi pago, e não 42 (defeito 5);
 * 2. entre notas, média exponencial com ALPHA sobre o preço observado, e cada
 *    nota conta como uma observação (defeito 3). A média corrida antiga nunca
 *    envelhecia: com n=20 um aumento real levava meses pra aparecer no número
 *    usado pra orçar.
 *
 * Linha cuja unidade é incompatível com a guardada não entra em conta nenhuma:
 * volta em `conflitos` pra confirmação na tela (defeito 4).
 */
export function learnPrices(base: PriceBase, rows: NFRow[], ref = hoje()): LearnResult {
  type Agg = { val: number; qty: number; e: DicEntry | null; units: Set<string>; unit: string };
  const agg: Record<string, Agg> = {};

  for (const r of rows) {
    const e = matchDic(r.desc);
    const name = e ? e.n : prettify(r.desc);
    const un = bucket(r.unit);
    if (!agg[name]) agg[name] = { val: 0, qty: 0, e, units: new Set(), unit: r.unit };
    const a = agg[name];
    a.val += r.unitPrice * r.qty;
    a.qty += r.qty;
    a.units.add(un);
    // A unidade guardada é a do dicionário, exceto quando a nota discorda da
    // natureza dela: aí vale o que a nota diz.
    a.unit = e && bucket(e.u) === un ? e.u : r.unit;
  }

  const next: PriceBase = { ...base };
  const learned: LearnedPrice[] = [];
  const conflitos: PriceConflict[] = [];
  let novos = 0;
  let recal = 0;

  for (const [name, a] of Object.entries(agg)) {
    const obs = a.qty > 0 ? a.val / a.qty : NaN;
    if (!Number.isFinite(obs) || obs <= 0) continue;

    const cur = next[name];
    // A própria nota traz o item por peso e por peça: não há o que aprender.
    if (a.units.size > 1) {
      conflitos.push({ name, unit: a.unit, price: obs, unitAtual: null });
      continue;
    }
    if (cur && bucket(cur.unit) !== bucket(a.unit)) {
      conflitos.push({ name, unit: a.unit, price: obs, unitAtual: cur.unit });
      continue;
    }

    if (cur) {
      next[name] = {
        ...cur,
        price: cur.price + ALPHA * (obs - cur.price),
        n: cur.n + 1,
        lastSeen: ref,
      };
      recal++;
    } else {
      next[name] = { price: obs, unit: a.unit, n: 1, lastSeen: ref };
      novos++;
    }
    learned.push({ name, entry: a.e, price: next[name].price });
  }

  return { base: next, novos, recal, learned, conflitos };
}
