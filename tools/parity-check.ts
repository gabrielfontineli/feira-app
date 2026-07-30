/*
 * Confere se a conta continua a mesma do app antigo (feira-app.html).
 *
 * Os números esperados foram calculados direto do EX_RAW do arquivo antigo,
 * por fora deste código, então isto é comparação de verdade e não tautologia.
 * Roda com: npm run check:parity
 */
import assert from 'node:assert/strict';
import { DIC } from '../src/lib/dic';
import { EX_BASE, exampleItems } from '../src/lib/example';
import { matchDic } from '../src/lib/match';
import { parseNF } from '../src/lib/parseNF';
import { learnPrices } from '../src/lib/prices';
import { itemCost, rawQty, sugQty } from '../src/lib/quantity';
import type { Cfg } from '../src/lib/types';

const cfg: Cfg = {
  pessoas: 2,
  dias: 30,
  loss: 25,
  vale: 0, // não entra em nenhuma conta daqui, só no "sobra/passa" da tela
  limpeza: 1,
  higiene: 1,
  extras: 0,
  started: 1,
};

const round = (n: number) => +n.toFixed(6);
const itens = exampleItems();
const on = itens.filter((i) => i.on);
const bucket = (f: string) =>
  round(on.filter((i) => i.freq === f).reduce((s, i) => s + itemCost(i, cfg), 0));

// Dados: 80 entradas no dicionário, 67 itens de exemplo (62 ligados), 37 preços.
assert.equal(DIC.length, 80);
assert.equal(itens.length, 67);
assert.equal(on.length, 62);
assert.equal(Object.keys(EX_BASE).length, 37);

// Totais do exemplo, com 25% de perda ao cozinhar.
assert.equal(round(on.reduce((s, i) => s + itemCost(i, cfg), 0)), 2407.216667);
assert.equal(bucket('mes'), 1431.230667);
assert.equal(bucket('quinzena'), 643.746);
assert.equal(bucket('semana'), 332.24);

// Peso cru: 4 kg de frango cozido = 5,33 kg cru.
assert.equal(round(rawQty(on.find((i) => i.name === 'Filé de frango')!, cfg)), 5.333333);

// `pp2` é medido pra 2 pessoas: dobra o número de pessoas, dobra a quantidade.
const ovos = matchDic('OVO BRANCO GRANDE')!;
assert.equal(sugQty(ovos, cfg), 4.5);
assert.equal(sugQty(ovos, { ...cfg, pessoas: 4 }), 9);

// Nota tabelada: descrição, quantidade e preço unitário de cada linha.
const { rows, skipped } = parseNF(
  '001\tFILE PEITO FGO SADIA BD 1KG\t1,0\tUN\t25,49\t0,00\t25,49\n' +
    '002\tARROZ BRANCO T1 PC 1KG\t2,0\tUN\t5,29\t0,00\t10,58',
);
assert.equal(rows.length, 2);
assert.equal(skipped.length, 0);
assert.equal(rows[0].unitPrice, 25.49);
assert.equal(rows[1].qty, 2);

const learned = learnPrices({}, rows);
assert.equal(learned.novos, 2);
assert.equal(round(learned.base['Filé de frango'].price), 25.49);
assert.equal(round(learned.base['Arroz'].price), 5.29);

console.log('parity OK — mesmas contas do feira-app.html');
