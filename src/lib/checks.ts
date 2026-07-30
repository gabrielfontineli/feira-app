import { slug } from './format';
import type { Checks, Item } from './types';

/**
 * Chave de marcação de compra. É o slug do nome, e não o `id` do item, porque
 * `id` sai de `nid()` e é regerado a cada re-seed ou reimportação — recarregar
 * o template órfãva toda marcação do mês (defeito 11).
 *
 * Efeito colateral aceito: renomear um item leva as marcações dele junto, e
 * dois itens com o mesmo nome compartilham marcação.
 */
export const checkKey = (it: Pick<Item, 'name'>): string => slug(it.name);

/**
 * Converte marcações antigas, chaveadas pelo `id` aleatório, pra chave estável.
 * Chave que não corresponde a nenhum item fica como está: é órfã de qualquer
 * jeito e apagar não devolveria nada.
 */
export function remapChecks(old: Checks, itens: Item[]): Checks {
  const byId = new Map(itens.map((i) => [i.id, checkKey(i)]));
  const next: Checks = {};
  for (const [k, v] of Object.entries(old)) next[byId.get(k) ?? k] = v;
  return next;
}
