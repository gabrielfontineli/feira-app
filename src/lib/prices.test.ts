import { describe, expect, it } from 'vitest';
import { learnPrices } from './prices';
import type { NFRow, PriceBase } from './types';

const HOJE = '2026-07-30';
const row = (desc: string, qty: number, unit: string, unitPrice: number): NFRow => ({
  desc,
  qty,
  unit,
  unitPrice,
});

describe('learnPrices · agregação dentro de uma nota', () => {
  it('pondera pela quantidade, não pelo número de linhas', () => {
    // Defeito 5: 0,5 kg a 40 e 2 kg a 44 dava 42. O que foi pago é 43,20.
    const { base } = learnPrices(
      {},
      [row('QUEIJO COALHO', 0.5, 'kg', 40), row('QUEIJO COALHO', 2, 'kg', 44)],
      HOJE,
    );
    expect(base['Queijo coalho'].price).toBeCloseTo(43.2, 6);
  });

  it('conta a nota como uma observação, não como uma por linha', () => {
    const { base } = learnPrices(
      {},
      [row('BANANA PRATA', 0.594, 'kg', 5.99), row('BANANA PRATA', 1.236, 'kg', 5.99)],
      HOJE,
    );
    expect(base['Banana'].n).toBe(1);
  });
});

describe('learnPrices · média que envelhece', () => {
  it('primeira observação entra como o preço da nota', () => {
    const { base, novos } = learnPrices({}, [row('ARROZ BRANCO T1', 1, 'kg', 5.29)], HOJE);
    expect(novos).toBe(1);
    expect(base['Arroz'].price).toBe(5.29);
    expect(base['Arroz'].n).toBe(1);
  });

  it('aumento real chega no preço em poucas notas (EWMA a=0,3)', () => {
    // Defeito 3: com média corrida e n=10, um preço de 10 entrava com peso
    // 1/11 e o número usado pra orçar virava 5,45.
    const base: PriceBase = { Arroz: { price: 5, unit: 'kg', n: 10 } };
    const r1 = learnPrices(base, [row('ARROZ', 1, 'kg', 10)], HOJE);
    expect(r1.base['Arroz'].price).toBeCloseTo(6.5, 6);
    expect(r1.recal).toBe(1);

    const r2 = learnPrices(r1.base, [row('ARROZ', 1, 'kg', 10)], HOJE);
    expect(r2.base['Arroz'].price).toBeCloseTo(7.55, 6);
  });

  it('marca a data da última nota que mexeu no preço', () => {
    const { base } = learnPrices({}, [row('ARROZ', 1, 'kg', 5.29)], HOJE);
    expect(base['Arroz'].lastSeen).toBe(HOJE);
  });

  it('lê base antiga, sem lastSeen, sem quebrar', () => {
    const base: PriceBase = { Arroz: { price: 5, unit: 'kg', n: 22 } };
    const { base: next } = learnPrices(base, [row('ARROZ', 1, 'kg', 6)], HOJE);
    expect(next['Arroz'].price).toBeCloseTo(5.3, 6);
    expect(next['Arroz'].lastSeen).toBe(HOJE);
    expect(next['Arroz'].n).toBe(23);
  });
});

describe('learnPrices · mistura de unidade', () => {
  it('recusa preço por peça num preço guardado por peso', () => {
    // Defeito 4: 42,49/kg e 17,00/un viravam uma média sem significado.
    const base: PriceBase = { 'Queijo coalho': { price: 42.49, unit: 'kg', n: 3 } };
    const { base: next, conflitos, recal } = learnPrices(base, [row('QUEIJO COALHO', 1, 'un', 17)], HOJE);
    expect(next['Queijo coalho'].price).toBe(42.49);
    expect(recal).toBe(0);
    expect(conflitos).toEqual([
      { name: 'Queijo coalho', unit: 'un', price: 17, unitAtual: 'kg' },
    ]);
  });

  it('recusa quando a própria nota se contradiz', () => {
    const { base, conflitos } = learnPrices(
      {},
      [row('QUEIJO COALHO', 0.45, 'kg', 42.49), row('QUEIJO COALHO', 1, 'un', 17)],
      HOJE,
    );
    expect(base['Queijo coalho']).toBeUndefined();
    expect(conflitos[0].unitAtual).toBeNull();
  });

  it('aceita unidade diferente do dicionário quando é a mesma natureza', () => {
    // Ovos: o dicionário diz 'bandeja', a nota diz 'CX'. Ambos são peça.
    const { base, conflitos } = learnPrices({}, [row('OVO BRANCO GRANDE', 1, 'cx', 22.9)], HOJE);
    expect(conflitos).toHaveLength(0);
    expect(base['Ovos']).toEqual({ price: 22.9, unit: 'bandeja', n: 1, lastSeen: HOJE });
  });

  it('guarda a unidade da nota quando ela contradiz o dicionário', () => {
    const { base } = learnPrices({}, [row('QUEIJO COALHO', 1, 'un', 17)], HOJE);
    expect(base['Queijo coalho'].unit).toBe('un');
  });
});
