import { prettify } from './format';
import { matchDic } from './parseNF';
import type { DicEntry, NFRow, PriceBase } from './types';

export interface LearnedPrice {
  name: string;
  entry: DicEntry | null;
  price: number;
}

export interface LearnResult {
  base: PriceBase;
  /** Nomes que ainda não tinham preço. */
  novos: number;
  /** Nomes cuja média foi recalculada. */
  recal: number;
  learned: LearnedPrice[];
}

/**
 * Transforma linhas de nota em preços de referência.
 *
 * Média corrida sobre o preço unitário, ponderada pelo número de linhas.
 * Portado sem mudança de feira-app.html:639-653, com os defeitos conhecidos:
 * a média nunca envelhece (`n` cresce sem limite), a unidade é ignorada no
 * recálculo, e a agregação dentro da mesma nota não pondera pela quantidade.
 * Corrigidos na fase 2, com teste antes.
 */
export function learnPrices(base: PriceBase, rows: NFRow[]): LearnResult {
  const agg: Record<string, { sum: number; n: number; e: DicEntry | null; unit: string }> = {};
  for (const r of rows) {
    const e = matchDic(r.desc);
    const name = e ? e.n : prettify(r.desc);
    if (!agg[name]) agg[name] = { sum: 0, n: 0, e, unit: e ? e.u : r.unit === 'kg' ? 'kg' : 'un' };
    agg[name].sum += r.unitPrice;
    agg[name].n++;
  }

  const next: PriceBase = { ...base };
  const learned: LearnedPrice[] = [];
  let novos = 0;
  let recal = 0;

  for (const [name, v] of Object.entries(agg)) {
    const cur = next[name];
    if (cur) {
      next[name] = {
        ...cur,
        price: (cur.price * cur.n + v.sum) / (cur.n + v.n),
        n: cur.n + v.n,
      };
      recal++;
    } else {
      next[name] = { price: v.sum / v.n, unit: v.unit, n: v.n };
      novos++;
    }
    learned.push({ name, entry: v.e, price: next[name].price });
  }

  return { base: next, novos, recal, learned };
}
