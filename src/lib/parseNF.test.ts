import { describe, expect, it } from 'vitest';
import { NF_ESPACO_SIMPLES, NF_ESPACOS, NF_TAB } from './nf.fixtures';
import { matchDic, parseNF } from './parseNF';

describe('parseNF · nota separada por tabulação', () => {
  const { rows, skipped } = parseNF(NF_TAB);

  it('lê uma linha por item e ignora cabeçalho, total e pagamento', () => {
    expect(rows.map((r) => r.desc)).toEqual([
      'FILE PEITO FGO SADIA BD 1KG',
      'ARROZ BRANCO T1 PC 5KG',
      'BANANA PRATA',
      'BANANA PRATA',
    ]);
    expect(skipped).toHaveLength(4);
  });

  it('lê quantidade, unidade e preço unitário', () => {
    expect(rows[0]).toEqual({
      desc: 'FILE PEITO FGO SADIA BD 1KG',
      qty: 1,
      unit: 'un',
      unitPrice: 25.49,
    });
  });

  it('lê linha por peso com quantidade fracionária', () => {
    expect(rows[2]).toEqual({ desc: 'BANANA PRATA', qty: 0.594, unit: 'kg', unitPrice: 5.99 });
    expect(rows[3].qty).toBe(1.236);
  });
});

describe('parseNF · nota alinhada com espaços', () => {
  const { rows, skipped } = parseNF(NF_ESPACOS);

  it('trata a coluna alinhada como separador e ignora os totais', () => {
    expect(rows).toHaveLength(4);
    expect(skipped).toHaveLength(3);
  });

  it('não confunde número dentro da descrição com quantidade', () => {
    const leite = rows.find((r) => r.desc.startsWith('LEITE'));
    expect(leite).toEqual({ desc: 'LEITE INTEGRAL 1L', qty: 6, unit: 'un', unitPrice: 4.79 });
  });

  it('mantém as duas linhas do mesmo item, pra agregação depois', () => {
    expect(rows.filter((r) => r.desc.startsWith('TOMATE'))).toHaveLength(2);
  });
});

describe('parseNF · nota colapsada em espaço simples', () => {
  const { rows, skipped } = parseNF(NF_ESPACO_SIMPLES);

  it('não deixa palavra da descrição virar a coluna de unidade', () => {
    // Defeito 1: 'PC' no meio da descrição ganhava a busca, a descrição virava
    // 'ARROZ BRANCO', a quantidade lia 'T1' e o preço lia '1KG' -> R$ 1,00.
    expect(rows[0]).toEqual({
      desc: 'ARROZ BRANCO T1 PC 1KG',
      qty: 2,
      unit: 'un',
      unitPrice: 5.29,
    });
  });

  it('lê preço com ponto decimal', () => {
    expect(rows[1]).toEqual({
      desc: 'FILE PEITO FGO SADIA BD 1KG',
      qty: 1,
      unit: 'un',
      unitPrice: 25.49,
    });
  });

  it('ignora unidade grudada em número dentro da descrição', () => {
    expect(rows[2]).toEqual({
      desc: 'OVO BRANCO GRANDE PC 30UN',
      qty: 1,
      unit: 'cx',
      unitPrice: 22.9,
    });
  });

  it('escolhe a unidade da direita quando a descrição repete a palavra', () => {
    expect(rows[3]).toEqual({ desc: 'BANANA PRATA KG', qty: 0.594, unit: 'kg', unitPrice: 5.99 });
  });

  it('ignora total e CNPJ', () => {
    expect(rows).toHaveLength(4);
    expect(skipped).toHaveLength(2);
  });
});

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
