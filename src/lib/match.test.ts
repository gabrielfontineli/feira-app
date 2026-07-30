import { describe, expect, it } from 'vitest';
import { fuzzyDic, matchDic, MIN_SCORE, resolve } from './match';

describe('matchDic', () => {
  it('casa descrição de nota com o nome canônico do dicionário', () => {
    expect(matchDic('FILE PEITO FGO SADIA BD 1KG')?.n).toBe('Filé de frango');
    expect(matchDic('OVO BRANCO GRANDE')?.n).toBe('Ovos');
    expect(matchDic('TOMATE ITALIANO')?.n).toBe('Tomate');
  });

  it('ignora acento e caixa', () => {
    expect(matchDic('brócolis ninja')?.n).toBe('Brócolis');
  });

  it('devolve null quando nada casa', () => {
    expect(matchDic('ZZZZ PRODUTO DESCONHECIDO')).toBeNull();
  });
});

describe('fuzzyDic', () => {
  it('reconhece erro de digitação da nota', () => {
    expect(fuzzyDic('FILE DE FRAGO SADIA BD')?.entry.n).toBe('Filé de frango');
    expect(fuzzyDic('MUSARELA FATIADA PC')?.entry.n).toBe('Queijo (muçarela/prato)');
    expect(fuzzyDic('ABSORVNT NOTURNO C/8')?.entry.n).toBe('Absorvente');
    expect(fuzzyDic('SOBRECX DESOSSADA')?.entry.n).toBe('Sobrecoxa desossada');
  });

  it('não chuta pra produto que o dicionário não conhece', () => {
    for (const d of ['PILHA AA DURACELL', 'LAMPADA LED 9W', 'CADERNO 10 MATERIAS', 'PENDRIVE 32GB']) {
      expect(fuzzyDic(d), d).toBeNull();
    }
  });

  it('diz qual chave casou, pra sugestão poder ser explicada', () => {
    const h = fuzzyDic('FILE DE FRAGO SADIA BD')!;
    expect(h.chave).toBe('file de frango');
    expect(h.score).toBeGreaterThan(MIN_SCORE);
  });
});

describe('resolve', () => {
  it('marca casamento literal como exato', () => {
    expect(resolve('FILE PEITO FGO SADIA')).toMatchObject({ conf: 'exata', name: 'Filé de frango' });
  });

  it('marca semelhança como difusa, pra pedir confirmação', () => {
    expect(resolve('FILE DE FRAGO SADIA BD')).toMatchObject({
      conf: 'difusa',
      name: 'Filé de frango',
    });
  });

  it('produto novo mesmo ganha nome do prettify', () => {
    expect(resolve('PILHA AA DURACELL')).toEqual({
      entry: null,
      name: 'Pilha aa duracell',
      conf: 'nenhuma',
    });
  });
});
