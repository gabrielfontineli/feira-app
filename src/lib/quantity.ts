import { nid } from './format';
import type { Cfg, DicEntry, Freq, Item, PriceBase } from './types';

/**
 * Teto da perda ao cozinhar. Existe pra `1 - perda` nunca virar zero: com
 * perda 100 a conta devolvia o peso cozido em silêncio (defeito 9). `toCfg` já
 * limita o cfg importado, mas o input da tela não é fronteira de confiança.
 */
export const LOSS_MAX = 90;

/**
 * Quantidade sugerida pro mês. `pp2` é medido pra 2 pessoas, daí o `pessoas/2`.
 * Portado de feira-app.html:559.
 */
export function sugQty(e: DicEntry, cfg: Cfg): number {
  const f = (cfg.pessoas / 2) * (cfg.dias / 30);
  return Math.round((e.pp2 || 1) * f * 100) / 100;
}

/**
 * Perda ao cozinhar que vale pra este item, em %: a do próprio item quando ela
 * existe, senão a global. Frango rende ~25%, peixe ~18%, moída ~30% — uma
 * perda só pra todos errava em algum deles (defeito 8).
 */
export function lossOf(it: Item, cfg: Cfg): number {
  const l = Number.isFinite(it.loss as number) ? (it.loss as number) : cfg.loss;
  return Math.min(LOSS_MAX, Math.max(0, Number.isFinite(l) ? l : 0));
}

/**
 * Quanto comprar cru. `qty` é peso já cozido quando `cook` está ligado, então
 * desconta a perda: cru = cozido / (1 - perda). Portado de feira-app.html:692.
 */
export function rawQty(it: Item, cfg: Cfg): number {
  if (!it.cook) return it.qty;
  return it.qty / (1 - lossOf(it, cfg) / 100);
}

export function itemCost(it: Item, cfg: Cfg): number {
  return rawQty(it, cfg) * (it.price || 0);
}

/**
 * Quantas vezes você compra este item no mês, pela frequência dele. Sai de
 * `cfg.dias` em vez de um campo novo: quem compra toda semana num mês de 30
 * dias vai ~4,3 vezes. Nunca menos de uma ida.
 */
export function idasNoMes(freq: Freq, cfg: Cfg): number {
  const dias = Math.max(1, cfg.dias);
  if (freq === 'semana') return Math.max(1, dias / 7);
  if (freq === 'quinzena') return Math.max(1, dias / 15);
  return 1;
}

/**
 * Quanto levar nesta ida ao mercado, em peso cru. `qty` é mensal — está
 * decidido —, mas a lista mostrava o número do mês embaixo de um cabeçalho que
 * diz "toda semana", então a banana de 5 kg lia como 5 kg por ida (defeito 6).
 */
export function qtyPorIda(it: Item, cfg: Cfg): number {
  return rawQty(it, cfg) / idasNoMes(it.freq, cfg);
}

/**
 * Item que a lista de um mês mostra: ligado, e não é avulso de outro mês. Mora
 * aqui, puro, porque quem exporta a lista precisa da mesma regra que a tela —
 * `feira.naLista` é só o atalho que já sabe qual mês está aberto.
 */
export function naLista(it: Item, mes: string): boolean {
  return it.on && (!it.soHoje || it.soHoje === mes);
}

/** Respeita os interruptores de limpeza / higiene / extras. */
export function allowed(e: DicEntry | null, cfg: Cfg): boolean {
  if (!e) return true;
  if (e.grp === 'limpeza' && !cfg.limpeza) return false;
  if (e.grp === 'higiene' && !cfg.higiene) return false;
  if (e.extra && !cfg.extras) return false;
  return true;
}

export function priceOf(base: PriceBase, n: string): number {
  return base[n] ? Math.round(base[n].price * 100) / 100 : 0;
}

/** Item novo a partir de uma entrada do dicionário. */
export function itemFromDic(e: DicEntry, cfg: Cfg, base: PriceBase, nameOverride?: string): Item {
  const name = nameOverride || e.n;
  return {
    id: nid(),
    name,
    cat: e.c || 'Outros',
    freq: e.f || 'mes',
    qty: sugQty(e, cfg),
    unit: e.u || 'un',
    price: priceOf(base, name),
    cook: !!e.cook,
    loss: e.loss,
    on: true,
    nota: '',
  };
}

/** Item avulso, pra linhas de dieta que o dicionário não reconheceu. */
export function itemFromLine(name: string, base: PriceBase): Item {
  return {
    id: nid(),
    name,
    cat: 'Outros',
    freq: 'mes',
    qty: 1,
    unit: 'un',
    price: priceOf(base, name),
    cook: false,
    on: true,
    nota: '',
  };
}
