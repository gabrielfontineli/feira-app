import { describe, expect, it } from 'vitest';
import { DEFAULT_CFG } from './cfg';
import { fromMd, toMd, toPlainText } from './md';
import type { Cfg, Item } from './types';

const cfg: Cfg = { ...DEFAULT_CFG, pessoas: 3, dias: 28, loss: 20, vale: 800, extras: 1 };

const item = (over: Partial<Item> = {}): Item => ({
  id: 'x1',
  name: 'Banana',
  cat: 'Frutas',
  freq: 'semana',
  qty: 3,
  unit: 'kg',
  price: 5.5,
  cook: false,
  on: true,
  nota: '',
  ...over,
});

const doc = (over: Partial<Parameters<typeof toMd>[0]> = {}) => ({
  cfg,
  itens: [item()],
  base: {},
  checks: {},
  mes: '2026-08',
  ...over,
});

/** Só os campos que o formato carrega — `id` é regerado na importação. */
const carregado = (i: Item) => ({
  name: i.name,
  cat: i.cat,
  freq: i.freq,
  qty: i.qty,
  unit: i.unit,
  price: i.price,
  cook: i.cook,
  loss: i.loss,
  soHoje: i.soHoje,
  nota: i.nota,
});

describe('toMd', () => {
  it('agrupa por categoria na ordem do CATORDER', () => {
    const md = toMd(
      doc({ itens: [item({ name: 'Banana', cat: 'Frutas' }), item({ name: 'Ovo', cat: 'Proteínas' })] }),
      'lista',
    );
    expect(md.indexOf('## Proteínas')).toBeLessThan(md.indexOf('## Frutas'));
  });

  it('escopo lista não leva ajustes nem preços aprendidos', () => {
    const md = toMd(doc({ base: { Banana: { price: 5.5, unit: 'kg', n: 2 } } }), 'lista');
    expect(md).not.toContain('## ajustes');
    expect(md).not.toContain('## preços aprendidos');
  });

  it('escopo tudo leva ajustes e preços aprendidos', () => {
    const md = toMd(doc({ base: { Banana: { price: 5.5, unit: 'kg', n: 2 } } }), 'tudo');
    expect(md).toContain('- pessoas: 3');
    expect(md).toContain('- orçamento: R$ 800');
    expect(md).toContain('Banana: R$ 5,50 / kg');
  });

  it('escopo lista omite item desligado e avulso de outro mês', () => {
    const md = toMd(
      doc({
        itens: [item({ name: 'Ligado' }), item({ name: 'Desligado', on: false }), item({ name: 'Velho', soHoje: '2026-06' })],
      }),
      'lista',
    );
    expect(md).toContain('Ligado');
    expect(md).not.toContain('Desligado');
    expect(md).not.toContain('Velho');
  });

  it('escopo tudo leva o item desligado, senão o backup perde item', () => {
    const md = toMd(doc({ itens: [item({ name: 'Desligado', on: false })] }), 'tudo');
    expect(md).toContain('Desligado');
    expect(md).toContain('desligado');
  });

  it('marca o que já foi comprado', () => {
    const md = toMd(doc({ checks: { banana: true } }), 'lista');
    expect(md).toContain('- [x] Banana');
  });
});

describe('fromMd', () => {
  it('ida e volta preserva os campos que o formato carrega', () => {
    const itens = [
      item({ name: 'Filé de frango', cat: 'Proteínas', freq: 'mes', qty: 4, unit: 'kg', price: 24.9, cook: true, loss: 30 }),
      item({ name: 'Banana', nota: 'a mais madura' }),
      item({ name: 'Sorvete', cat: 'Extras', soHoje: '2026-08' }),
      item({ name: 'Detergente', cat: 'Limpeza', on: false }),
    ];
    const d = doc({ itens });
    const volta = fromMd(toMd(d, 'tudo'), '2026-08');
    expect(volta.itens.map(carregado)).toEqual(itens.map(carregado));
    expect(volta.itens.map((i) => i.on)).toEqual([true, true, true, false]);
  });

  it('ida e volta preserva os ajustes', () => {
    const volta = fromMd(toMd(doc(), 'tudo'), '2026-08');
    expect(volta.cfg).toMatchObject({ pessoas: 3, dias: 28, loss: 20, vale: 800, extras: 1, limpeza: 1, higiene: 1 });
  });

  it('ida e volta preserva a base de preços', () => {
    const base = { Banana: { price: 5.5, unit: 'kg', n: 4, lastSeen: '2026-07-15' } };
    const volta = fromMd(toMd(doc({ base }), 'tudo'), '2026-08');
    expect(volta.base).toEqual(base);
  });

  it('ida e volta preserva as marcações', () => {
    const volta = fromMd(toMd(doc({ checks: { banana: true } }), 'lista'), '2026-08');
    expect(volta.checks).toEqual({ banana: true });
  });

  it('campos vêm em qualquer ordem', () => {
    const [i] = fromMd('## Frutas\n- [ ] Banana · R$ 5,50 · semana · 3 kg', '2026-08').itens;
    expect(i).toMatchObject({ qty: 3, unit: 'kg', freq: 'semana', price: 5.5 });
  });

  it('item sem campo nenhum herda o dicionário', () => {
    // O DIC sabe categoria, unidade, frequência e quantidade da banana. Só o
    // nome basta, que é o que faz o mesmo parser servir de entrada de dieta.
    const [i] = fromMd('Banana', '2026-08').itens;
    expect(i).toMatchObject({ name: 'Banana', cat: 'Frutas', unit: 'kg' });
    expect(i.qty).toBeGreaterThan(0);
  });

  it('documento cru de dieta: uma linha por nome, sem cabeçalho', () => {
    const r = fromMd('Arroz branco\nOvo de galinha\nBrócolis', '2026-08');
    expect(r.itens.map((i) => i.name)).toEqual(['Arroz branco', 'Ovo de galinha', 'Brócolis']);
    expect(r.cfg).toBeUndefined();
  });

  it('aceita marcador de lista, numeração e caixa vazia', () => {
    const r = fromMd('- Arroz\n* Feijão\n1. Café\n- [ ] Sal\n- [X] Açúcar', '2026-08');
    expect(r.itens.map((i) => i.name)).toEqual(['Arroz', 'Feijão', 'Café', 'Sal', 'Açúcar']);
    expect(r.checks).toEqual({ acucar: true });
  });

  it('categoria desconhecida é preservada como escrita', () => {
    const [i] = fromMd('## Padaria fina\n- Croissant', '2026-08').itens;
    expect(i.cat).toBe('Padaria fina');
  });

  it('o nome escrito ganha do nome do dicionário', () => {
    const [i] = fromMd('- Bananinha da feira · 2 kg', '2026-08').itens;
    expect(i.name).toBe('Bananinha da feira');
  });

  it('`hoje` prende o item ao mês passado por parâmetro', () => {
    const [i] = fromMd('- Sorvete · hoje', '2026-08').itens;
    expect(i.soHoje).toBe('2026-08');
  });

  it('cozimento desligado à mão não volta ligado pelo dicionário', () => {
    // O DIC cozinha o filé de frango. Quem desligou isso na tela de itens quis
    // comprar 4 kg, não 5,3 kg — sem o marcador `cru`, a ida e volta mudava a
    // quantidade de compra sozinha.
    const cru = item({ name: 'Filé de frango', cat: 'Proteínas', cook: false });
    const md = toMd(doc({ itens: [cru] }), 'tudo');
    expect(md).toContain(' · cru');
    expect(fromMd(md, '2026-08').itens[0].cook).toBe(false);
  });

  it('`cozinha` sem porcentagem liga o cozimento sem forçar perda', () => {
    const [i] = fromMd('- Filé de frango · cozinha', '2026-08').itens;
    expect(i.cook).toBe(true);
    expect(i.loss).toBeUndefined();
  });

  it('o que não é campo conhecido vira nota', () => {
    const [i] = fromMd('- Queijo · 1 kg · o meia-cura da barraca do fundo', '2026-08').itens;
    expect(i.nota).toBe('o meia-cura da barraca do fundo');
    expect(i.qty).toBe(1);
  });

  it('unidade que o usuário inventou sobrevive à ida e volta', () => {
    // A quantidade é reconhecida pela forma (um número e uma palavra), não por
    // lista fechada de unidades: o editor deixa digitar a unidade que quiser, e
    // uma lista fechada perderia justamente essa.
    const [i] = fromMd('- Vinho · 2 garrafas', '2026-08').itens;
    expect(i).toMatchObject({ qty: 2, unit: 'garrafas' });
  });

  it('a segunda coisa com cara de quantidade é nota, não quantidade', () => {
    const [i] = fromMd('- Ovo · 2 cartelas · 3 grandes', '2026-08').itens;
    expect(i).toMatchObject({ qty: 2, unit: 'cartelas', nota: '3 grandes' });
  });

  it('ignora título, comentário e linha em branco', () => {
    const r = fromMd('# feira · agosto\n\n<!-- feira md v1 -->\n\n- Arroz\n', '2026-08');
    expect(r.itens.map((i) => i.name)).toEqual(['Arroz']);
  });

  it('texto vazio não devolve item nenhum', () => {
    expect(fromMd('   \n\n', '2026-08').itens).toEqual([]);
  });

  it('ajuste ilegível é omitido em vez de virar NaN', () => {
    // Quem confere o cfg é o `toCfg`, na hora de aplicar. O parser só não pode
    // entregar NaN pra ele: `toCfg` trocaria por padrão de qualquer jeito, mas
    // um `Partial<Cfg>` com NaN dentro é armadilha pra quem ler daqui.
    const r = fromMd('## ajustes\n- pessoas: banana\n- dias: 28', '2026-08');
    expect(r.cfg).toEqual({ dias: 28 });
  });
});

describe('toPlainText', () => {
  it('só o que falta comprar, uma linha por item, sem colchete', () => {
    const itens = [item({ name: 'Banana' }), item({ name: 'Ovo', cat: 'Proteínas', freq: 'mes' })];
    const txt = toPlainText(itens, { banana: true }, cfg);
    expect(txt).not.toContain('[');
    expect(txt.split('\n')).toEqual(['Ovo 3 kg']);
  });

  it('quantidade é a da ida, em peso cru — é o que se põe no carrinho', () => {
    // 4 kg cozidos por mês, perda 20%, compra semanal num mês de 28 dias:
    // cru = 4 / 0,8 = 5 kg, em 4 idas = 1,25 kg por ida.
    const txt = toPlainText([item({ name: 'Frango', freq: 'semana', qty: 4, cook: true })], {}, cfg);
    expect(txt).toBe('Frango 1,25 kg');
  });

  it('lista toda comprada devolve texto vazio', () => {
    expect(toPlainText([item()], { banana: true }, cfg)).toBe('');
  });
});
