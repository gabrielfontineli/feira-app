import { DIC } from './dic';
import { norm } from './format';
import type { DicEntry } from './types';

/*
 * Casamento entre descrição de nota fiscal e o dicionário.
 *
 * Mora fora de parseNF.ts de propósito: ler a nota é uma coisa, decidir de que
 * produto a linha fala é outra. O parser não conhece o dicionário, e este
 * módulo não conhece o formato da nota.
 */

/** Primeira entrada do dicionário cuja palavra-chave aparece na descrição. */
export function matchDic(s: string): DicEntry | null {
  const d = norm(s);
  for (const e of DIC) for (const k of e.k) if (d.includes(norm(k))) return e;
  return null;
}
