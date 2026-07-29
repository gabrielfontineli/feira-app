import { nid } from './format';
import type { Cfg, DicEntry, Item, PriceBase } from './types';

/**
 * Quantidade sugerida pro mês. Atenção: `pp` é medido pra 2 pessoas, não por
 * pessoa — daí o `pessoas/2`. Portado de feira-app.html:559.
 */
export function sugQty(e: DicEntry, cfg: Cfg): number {
  const f = (cfg.pessoas / 2) * (cfg.dias / 30);
  return Math.round((e.pp || 1) * f * 100) / 100;
}

/**
 * Quanto comprar cru. `qty` é peso já cozido quando `cook` está ligado, então
 * desconta a perda: cru = cozido / (1 - perda). Portado de feira-app.html:692.
 */
export function rawQty(it: Item, cfg: Cfg): number {
  if (!it.cook) return it.qty;
  const f = 1 - cfg.loss / 100;
  return f > 0 ? it.qty / f : it.qty;
}

export function itemCost(it: Item, cfg: Cfg): number {
  return rawQty(it, cfg) * (it.price || 0);
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
