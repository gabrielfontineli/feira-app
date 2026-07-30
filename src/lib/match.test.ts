import { describe, expect, it } from 'vitest';
import { matchDic } from './match';

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
