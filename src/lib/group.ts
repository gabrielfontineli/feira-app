import { CATORDER } from './dic';
import type { Item } from './types';

/**
 * Agrupa itens por categoria seguindo CATORDER, com as categorias
 * desconhecidas no fim. Mesmo comportamento do app antigo, que fazia
 * `CATORDER.concat(Object.keys(byCat).filter(...))`.
 */
export function byCategory(list: Item[]): [string, Item[]][] {
  const m = new Map<string, Item[]>();
  for (const i of list) {
    const arr = m.get(i.cat);
    if (arr) arr.push(i);
    else m.set(i.cat, [i]);
  }
  const known = CATORDER.filter((c) => m.has(c));
  const extra = [...m.keys()].filter((c) => !CATORDER.includes(c));
  return [...known, ...extra].map((c) => [c, m.get(c)!]);
}
