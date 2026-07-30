import { describe, expect, it } from 'vitest';
import { sugerir } from './suggest';
import type { Item } from './types';

const item = (name: string, on = true): Item => ({
  id: 'x1',
  name,
  cat: 'Outros',
  freq: 'mes',
  qty: 1,
  unit: 'un',
  price: 0,
  cook: false,
  on,
  nota: '',
});

const nomes = (q: string, itens: Item[] = [], limite?: number) =>
  sugerir(q, itens, limite).map((s) => s.name);

describe('sugerir', () => {
  it('casa pelo nome do dicionário', () => {
    expect(nomes('banan')).toContain('Banana');
  });

  it('casa por palavra-chave, que é como a nota fiscal escreve', () => {
    expect(nomes('peito fgo')).toContain('Filé de frango');
  });

  it('ignora acento e caixa', () => {
    expect(nomes('MAÇÃ')).toContain('Maçã');
    expect(nomes('maca')).toContain('Maçã');
  });

  it('quem começa com a busca vem antes de quem só contém', () => {
    // 'Pão de forma' começa com 'pao'; 'Filé de frango' só contém, via a
    // palavra-chave 'peito de frango'. Prefixo primeiro.
    const r = nomes('pao');
    expect(r[0]).toBe('Pão francês');
  });

  it('não repete o mesmo item do dicionário duas vezes', () => {
    // 'Tangerina / laranja' casa pelo nome e pela chave 'tangerina'.
    const r = nomes('tangerina');
    expect(r.filter((n) => n === 'Tangerina / laranja')).toHaveLength(1);
  });

  it('marca o que já está na lista em vez de oferecer duplicata', () => {
    const [s] = sugerir('banana', [item('Banana')]);
    expect(s.name).toBe('Banana');
    expect(s.existente?.name).toBe('Banana');
  });

  it('acha o existente mesmo com acento e caixa diferentes', () => {
    const [s] = sugerir('maca', [item('MAÇÃ')]);
    expect(s.name).toBe('Maçã');
    expect(s.existente?.name).toBe('MAÇÃ');
  });

  it('match exato ganha de quem só começa igual', () => {
    // 'maca' inteiro é a maçã. 'macarrao' também começa com 'maca', e vinha
    // antes só porque está mais acima no DIC.
    expect(nomes('maca')[0]).toBe('Maçã');
  });

  it('nada casa: devolve o texto livre, sem entrada de dicionário', () => {
    const r = sugerir('escova de garrafa', []);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: 'Escova de garrafa', entry: null, existente: null });
  });

  it('busca vazia não sugere nada', () => {
    expect(sugerir('  ', [])).toEqual([]);
  });

  it('respeita o limite', () => {
    expect(nomes('a', [], 3)).toHaveLength(3);
  });

  it('não filtra por limpeza/higiene/extras: quem digitou o nome foi você', () => {
    // `allowed()` corta esses grupos na sugestão automática da dieta. Aqui não:
    // pedir 'detergente' com a limpeza desligada tem que achar detergente.
    expect(nomes('deterg')).toContain('Detergente');
    expect(nomes('chocolate')).toContain('Doces');
  });
});
