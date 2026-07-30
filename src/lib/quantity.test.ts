import { describe, expect, it } from 'vitest';
import { matchDic } from './parseNF';
import { itemCost, itemFromDic, LOSS_MAX, rawQty, sugQty } from './quantity';
import type { Cfg, Item } from './types';

const cfg: Cfg = {
  pessoas: 2,
  dias: 30,
  loss: 25,
  vale: 0,
  limpeza: 1,
  higiene: 1,
  extras: 0,
  started: 1,
};

const item = (over: Partial<Item> = {}): Item => ({
  id: 'teste',
  name: 'Teste',
  cat: 'Outros',
  freq: 'mes',
  qty: 4,
  unit: 'kg',
  price: 10,
  cook: true,
  on: true,
  nota: '',
  ...over,
});

describe('sugQty', () => {
  it('escala com o número de pessoas a partir da medida pra dois', () => {
    // `pp2` é a quantidade mensal de uma casa de duas pessoas — o nome diz.
    const ovos = matchDic('OVO BRANCO GRANDE')!;
    expect(sugQty(ovos, cfg)).toBe(4.5);
    expect(sugQty(ovos, { ...cfg, pessoas: 4 })).toBe(9);
    expect(sugQty(ovos, { ...cfg, pessoas: 1 })).toBe(2.25);
  });

  it('escala com o número de dias', () => {
    const ovos = matchDic('OVO BRANCO GRANDE')!;
    expect(sugQty(ovos, { ...cfg, dias: 15 })).toBe(2.25);
  });
});

describe('rawQty · perda ao cozinhar', () => {
  it('não desconta nada quando o item não cozinha', () => {
    expect(rawQty(item({ cook: false }), cfg)).toBe(4);
  });

  it('usa a perda global quando o item não tem a sua', () => {
    expect(rawQty(item(), cfg)).toBeCloseTo(5.333333, 6);
  });

  it('usa a perda do item quando existe', () => {
    // Defeito 8: peixe rende mais que frango, e uma perda global só errava um
    // dos dois. 1,5 kg cozido a 18% = 1,83 kg cru.
    expect(rawQty(item({ qty: 1.5, loss: 18 }), cfg)).toBeCloseTo(1.829268, 6);
  });

  it('perda 0 no item vale 0, e não cai na global', () => {
    expect(rawQty(item({ loss: 0 }), cfg)).toBe(4);
  });

  it('não devolve o peso cozido em silêncio quando a perda é 100', () => {
    // Defeito 9: loss=100 fazia f=0 e a função devolvia qty sem avisar.
    expect(rawQty(item(), { ...cfg, loss: 100 })).toBeCloseTo(4 / (1 - LOSS_MAX / 100), 6);
    expect(rawQty(item({ loss: 100 }), cfg)).toBeCloseTo(4 / (1 - LOSS_MAX / 100), 6);
  });

  it('ignora perda negativa ou inválida', () => {
    expect(rawQty(item({ loss: -20 }), cfg)).toBe(4);
    expect(rawQty(item(), { ...cfg, loss: NaN })).toBe(4);
  });
});

describe('itemCost', () => {
  it('cobra pelo peso cru, que é o que vai no carrinho', () => {
    expect(itemCost(item(), cfg)).toBeCloseTo(53.333333, 6);
  });
});

describe('itemFromDic', () => {
  it('traz a perda do dicionário pro item', () => {
    const peixe = matchDic('TILAPIA FILE')!;
    expect(itemFromDic(peixe, cfg, {}).loss).toBe(18);
  });

  it('deixa a perda vazia quando o dicionário não tem opinião', () => {
    const frango = matchDic('FILE PEITO FGO')!;
    expect(itemFromDic(frango, cfg, {}).loss).toBeUndefined();
  });
});
