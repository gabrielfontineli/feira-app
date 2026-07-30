import { describe, expect, it } from 'vitest';
import { checkKey, remapChecks } from './checks';
import { slug } from './format';
import { exampleItems } from './example';
import type { Item } from './types';

const item = (id: string, name: string): Item => ({
  id,
  name,
  cat: 'Outros',
  freq: 'mes',
  qty: 1,
  unit: 'un',
  price: 1,
  cook: false,
  on: true,
  nota: '',
});

describe('slug', () => {
  it('tira acento, caixa e pontuação', () => {
    expect(slug('Filé de frango')).toBe('file-de-frango');
    expect(slug('Açúcar / adoçante')).toBe('acucar-adocante');
    expect(slug('Queijo (muçarela/prato)')).toBe('queijo-mucarela-prato');
    expect(slug('Pão francês')).toBe('pao-frances');
  });

  it('não deixa traço sobrando na ponta', () => {
    expect(slug('  Ovos!  ')).toBe('ovos');
  });

  it('é o mesmo slug pro mesmo nome, sempre', () => {
    expect(slug('Banana')).toBe(slug('banana'));
  });
});

describe('remapChecks', () => {
  it('troca o id aleatório pela chave estável', () => {
    // Defeito 11: o id vinha de nid(), regerado a cada re-seed, então
    // recarregar o template órfãva toda marcação de compra.
    const itens = [item('xa1b2c3', 'Filé de frango'), item('xd4e5f6', 'Banana')];
    expect(remapChecks({ xa1b2c3: true, xd4e5f6: true }, itens)).toEqual({
      'file-de-frango': true,
      banana: true,
    });
  });

  it('mantém chave que já é slug', () => {
    const itens = [item('file-de-frango', 'Filé de frango')];
    expect(remapChecks({ 'file-de-frango': true }, itens)).toEqual({ 'file-de-frango': true });
  });

  it('não apaga marcação de item que não existe mais', () => {
    expect(remapChecks({ xzzzzzz: true }, [])).toEqual({ xzzzzzz: true });
  });

  it('sobrevive ao re-seed do exemplo: ids novos, marcações no lugar', () => {
    const antes = exampleItems();
    const marcado = Object.fromEntries(antes.slice(0, 3).map((i) => [checkKey(i), true]));
    const depois = exampleItems();
    expect(antes[0].id).not.toBe(depois[0].id);
    expect(depois.slice(0, 3).every((i) => marcado[checkKey(i)])).toBe(true);
  });
});
