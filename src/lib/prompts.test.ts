import { describe, expect, it } from 'vitest';
import { fromMd } from './md';
import { parseNF } from './parseNF';
import { LISTA_MD, NOTA } from './prompts';

/*
 * Prompt é texto, e texto não quebra o build — quebra a importação, em
 * silêncio, meses depois. Cada pedido aqui promete um formato a um parser deste
 * app; estes testes conferem que a promessa e o parser ainda combinam.
 *
 * O que é verificado é o exemplo que o prompt mostra, não a resposta de uma
 * LLM de verdade: o que está sob nosso controle é o contrato.
 */

describe('o pedido da nota fiscal', () => {
  /** Quatro colunas por tabulação, como o NOTA manda responder. */
  const resposta =
    'FILE PEITO FGO SADIA BD 1KG\t1,0\tun\t25,49\n' +
    'ARROZ BRANCO T1 PC 1KG\t2,0\tun\t5,29\n' +
    'BANANA PRATA\t1,052\tkg\t6,99';

  it('o formato que ele pede é o que o parseNF lê', () => {
    const { rows, skipped } = parseNF(resposta);
    expect(skipped).toEqual([]);
    expect(rows).toEqual([
      { desc: 'FILE PEITO FGO SADIA BD 1KG', qty: 1, unit: 'un', unitPrice: 25.49 },
      { desc: 'ARROZ BRANCO T1 PC 1KG', qty: 2, unit: 'un', unitPrice: 5.29 },
      { desc: 'BANANA PRATA', qty: 1.052, unit: 'kg', unitPrice: 6.99 },
    ]);
  });

  it('as unidades que ele lista são todas aceitas pelo parser', () => {
    const listadas = /uma destas: (.+?) — escolha/s.exec(NOTA)?.[1] ?? '';
    const unidades = listadas.split(',').map((s) => s.replace(/\s+/g, ' ').trim());
    expect(unidades.length).toBeGreaterThan(5);
    for (const u of unidades) {
      const { rows } = parseNF(`PRODUTO QUALQUER\t1,0\t${u}\t9,99`);
      expect(rows, u).toHaveLength(1);
    }
  });
});

describe('o pedido do markdown', () => {
  it('o exemplo que ele mostra é lido pelo fromMd', () => {
    const doc = fromMd(LISTA_MD, '2026-08');
    const frango = doc.itens.find((i) => i.name === 'Filé de frango');
    expect(frango).toMatchObject({ cat: 'Proteínas', qty: 4, unit: 'kg', freq: 'mes', cook: true });
    expect(doc.itens.find((i) => i.name === 'Banana')).toMatchObject({
      cat: 'Frutas',
      qty: 3,
      freq: 'semana',
    });
  });

  it('as categorias que ele lista são as que o app ordena', async () => {
    const { CATORDER } = await import('./dic');
    const listadas = /use estas, nesta ordem: (.+?);/s.exec(LISTA_MD)?.[1] ?? '';
    const cats = listadas.split(',').map((s) => s.replace(/\s+/g, ' ').trim());
    expect(cats).toEqual(CATORDER);
  });
});
