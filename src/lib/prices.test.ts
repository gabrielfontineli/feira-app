import { describe, expect, it } from 'vitest';
import { aceitarPendente, learnPrices, registrarPago } from './prices';
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

describe('learnPrices · casamento difuso', () => {
  it('não guarda preço de casamento só parecido', () => {
    // Entrega 3: casamento de baixa confiança tem que aparecer pro usuário
    // confirmar, não entrar calado na base de preço.
    const { base, pendentes, novos } = learnPrices(
      {},
      [row('FILE DE FRAGO SADIA BD 1KG', 1, 'un', 25.49)],
      HOJE,
    );
    expect(base).toEqual({});
    expect(novos).toBe(0);
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0]).toMatchObject({
      desc: 'FILE DE FRAGO SADIA BD 1KG',
      name: 'Filé de frango',
      chave: 'file de frango',
      price: 25.49,
      nameAlt: 'File de frago',
    });
  });

  it('pondera as linhas do pendente pela quantidade, como as outras', () => {
    const { pendentes } = learnPrices(
      {},
      [row('MUSARELA FATIADA', 0.5, 'kg', 40), row('MUSARELA FATIADA', 2, 'kg', 44)],
      HOJE,
    );
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].price).toBeCloseTo(43.2, 6);
  });

  it('casamento literal segue entrando direto', () => {
    const { base, pendentes } = learnPrices({}, [row('FILE PEITO FGO SADIA', 1, 'un', 25.49)], HOJE);
    expect(pendentes).toHaveLength(0);
    expect(base['Filé de frango'].price).toBe(25.49);
  });

  it('produto desconhecido entra sob o nome próprio, sem perguntar', () => {
    const { base, pendentes } = learnPrices({}, [row('PILHA AA DURACELL', 2, 'un', 18.9)], HOJE);
    expect(pendentes).toHaveLength(0);
    expect(base['Pilha aa duracell'].price).toBe(18.9);
  });
});

describe('aceitarPendente', () => {
  const pendente = () => learnPrices({}, [row('FILE DE FRAGO SADIA', 1, 'un', 25.49)], HOJE).pendentes[0];

  it('confirmado, o preço entra no nome sugerido', () => {
    const { base, novo } = aceitarPendente({}, pendente(), undefined, HOJE);
    expect(novo).toBe(true);
    expect(base['Filé de frango']).toEqual({ price: 25.49, unit: 'un', n: 1, lastSeen: HOJE });
  });

  it('recusado, o preço pode ir pro nome próprio da descrição', () => {
    const p = pendente();
    const { base } = aceitarPendente({}, p, p.nameAlt, HOJE);
    expect(base[p.nameAlt].price).toBe(25.49);
    expect(p.nameAlt).toBe('File de frago');
    expect(base['Filé de frango']).toBeUndefined();
  });

  it('recalibra por EWMA quando o nome já tem preço', () => {
    const base = { 'Filé de frango': { price: 20, unit: 'un', n: 4 } };
    const r = aceitarPendente(base, pendente(), undefined, HOJE);
    expect(r.novo).toBe(false);
    expect(r.base['Filé de frango'].price).toBeCloseTo(20 + 0.3 * (25.49 - 20), 6);
  });

  it('ainda recusa mistura de unidade', () => {
    const base = { 'Filé de frango': { price: 25, unit: 'kg', n: 2 } };
    const r = aceitarPendente(base, pendente(), undefined, HOJE);
    expect(r.conflito).toMatchObject({ unitAtual: 'kg', unit: 'un' });
    expect(r.base['Filé de frango'].price).toBe(25);
  });
});

describe('registrarPago · preço digitado ao riscar o item da lista', () => {
  const KEY = 'file-de-frango';
  const NOME = 'Filé de frango';

  it('primeira digitação entra como o preço, igual à primeira nota', () => {
    const r = registrarPago({}, {}, KEY, NOME, 42.9, 'kg', HOJE);
    expect(r.base[NOME]).toMatchObject({ price: 42.9, unit: 'kg', n: 1, lastSeen: HOJE });
    expect(r.pagos[KEY]).toMatchObject({ name: NOME, obs: 42.9, prev: null });
  });

  it('recalibra por EWMA quando já havia preço guardado', () => {
    const base: PriceBase = { [NOME]: { price: 20, unit: 'kg', n: 4 } };
    const r = registrarPago(base, {}, KEY, NOME, 25.49, 'kg', HOJE);
    expect(r.base[NOME].price).toBeCloseTo(20 + 0.3 * (25.49 - 20), 6);
    expect(r.pagos[KEY].prev).toEqual({ price: 20, unit: 'kg', n: 4 });
  });

  it('corrigir o valor digitado não conta duas vezes na média', () => {
    // O caso que importa: digitar 42,90 no lugar de 4,29 e consertar. Sem
    // desfazer a observação anterior, a EWMA comeria as duas e o número usado
    // pra orçar sairia entre elas.
    const base: PriceBase = { [NOME]: { price: 20, unit: 'kg', n: 4 } };
    const errado = registrarPago(base, {}, KEY, NOME, 42.9, 'kg', HOJE);
    const corrigido = registrarPago(errado.base, errado.pagos, KEY, NOME, 4.29, 'kg', HOJE);
    const dePrimeira = registrarPago(base, {}, KEY, NOME, 4.29, 'kg', HOJE);
    expect(corrigido.base).toEqual(dePrimeira.base);
    expect(corrigido.pagos).toEqual(dePrimeira.pagos);
  });

  it('apagar o campo devolve o preço que havia antes', () => {
    const base: PriceBase = { [NOME]: { price: 20, unit: 'kg', n: 4, lastSeen: '2026-01-01' } };
    const r1 = registrarPago(base, {}, KEY, NOME, 42.9, 'kg', HOJE);
    const r2 = registrarPago(r1.base, r1.pagos, KEY, NOME, NaN, 'kg', HOJE);
    expect(r2.base).toEqual(base);
    expect(r2.pagos[KEY]).toBeUndefined();
  });

  it('apagar o campo de um nome novo tira o nome da base', () => {
    const r1 = registrarPago({}, {}, KEY, NOME, 42.9, 'kg', HOJE);
    const r2 = registrarPago(r1.base, r1.pagos, KEY, NOME, 0, 'kg', HOJE);
    expect(r2.base).toEqual({});
  });

  it('unidade incompatível não entra: devolve conflito e deixa a base intacta', () => {
    const base: PriceBase = { [NOME]: { price: 25, unit: 'kg', n: 2 } };
    const r = registrarPago(base, {}, KEY, NOME, 17, 'un', HOJE);
    expect(r.conflito).toMatchObject({ name: NOME, unit: 'un', unitAtual: 'kg' });
    expect(r.base).toEqual(base);
    expect(r.pagos).toEqual({});
  });

  it('conflito não destrói o registro válido anterior do mesmo item', () => {
    const base: PriceBase = { [NOME]: { price: 25, unit: 'kg', n: 2 } };
    const ok = registrarPago(base, {}, KEY, NOME, 30, 'kg', HOJE);
    const ruim = registrarPago(ok.base, ok.pagos, KEY, NOME, 17, 'un', HOJE);
    expect(ruim.base).toEqual(ok.base);
    expect(ruim.pagos).toEqual(ok.pagos);
  });
});
