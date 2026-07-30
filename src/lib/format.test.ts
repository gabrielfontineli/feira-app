import { describe, expect, it } from 'vitest';
import { toNum } from './format';

describe('toNum', () => {
  it('lê decimal por vírgula, com ponto de milhar', () => {
    expect(toNum('5,29')).toBe(5.29);
    expect(toNum('1.052,80')).toBe(1052.8);
    expect(toNum('12.345.678,90')).toBe(12345678.9);
    expect(toNum('2,0')).toBe(2);
  });

  it('lê decimal por ponto sem multiplicar por 100', () => {
    // Defeito 2: 25.49 virava 2549 e envenenava a base de preço.
    expect(toNum('25.49')).toBe(25.49);
    expect(toNum('0.5')).toBe(0.5);
    expect(toNum('.5')).toBe(0.5);
  });

  it('mantém quantidade fracionária de linha por peso', () => {
    expect(toNum('0,594')).toBe(0.594);
    expect(toNum('1,236')).toBe(1.236);
  });

  it('lê inteiro sem separador', () => {
    expect(toNum('1000')).toBe(1000);
    expect(toNum('7')).toBe(7);
  });

  it('devolve NaN pro que não é número', () => {
    // Estrito: parseFloat lia '1KG' como 1, e era assim que a linha mal
    // fatiada entrava como preço de R$ 1,00 (defeito 1).
    expect(toNum('1KG')).toBeNaN();
    expect(toNum('30UN')).toBeNaN();
    expect(toNum('T1')).toBeNaN();
    expect(toNum('')).toBeNaN();
    expect(toNum(null)).toBeNaN();
    expect(toNum(undefined)).toBeNaN();
    expect(toNum('KG')).toBeNaN();
  });

  it('aceita número já pronto', () => {
    expect(toNum(25.49)).toBe(25.49);
    expect(toNum(0)).toBe(0);
  });
});
