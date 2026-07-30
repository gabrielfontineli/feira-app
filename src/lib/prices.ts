import { prettify } from './format';
import { resolve } from './match';
import type { DicEntry, NFRow, Pagos, PriceBase, PriceEntry } from './types';

/**
 * Peso do preço novo na média exponencial. Com 0,3 um aumento real chega em
 * ~80% do valor novo em cinco notas, em vez de nunca.
 */
export const ALPHA = 0.3;

/** Dias sem ver o item na nota antes de o preço virar suspeito no orçamento. */
export const STALE_DIAS = 120;

export interface LearnedPrice {
  name: string;
  entry: DicEntry | null;
  price: number;
}

/** Preço que a nota trouxe numa unidade incompatível com a que está guardada. */
export interface PriceConflict {
  name: string;
  /** Unidade que veio na nota. */
  unit: string;
  /** Preço unitário que veio na nota. */
  price: number;
  /** Unidade já guardada, ou null quando a própria nota traz as duas. */
  unitAtual: string | null;
}

/**
 * Casamento por semelhança à espera de confirmação. Não entrou na base: um
 * palpite errado aqui estraga o preço de outro item, e é o usuário que sabe se
 * 'FILE DE FRAGO SADIA' é o filé de frango dele.
 */
export interface PendingMatch {
  /** Descrição como veio na nota. */
  desc: string;
  /** Nome sugerido pelo dicionário. */
  name: string;
  entry: DicEntry;
  /** Palavra-chave que casou — explica a sugestão. */
  chave: string;
  /** 0 a 1. */
  score: number;
  /** Preço observado nesta nota, já ponderado pela quantidade. */
  price: number;
  unit: string;
  /** Nome usado se você recusar a sugestão e guardar separado. */
  nameAlt: string;
}

export interface LearnResult {
  base: PriceBase;
  /** Nomes que ainda não tinham preço. */
  novos: number;
  /** Nomes cujo preço foi recalibrado. */
  recal: number;
  learned: LearnedPrice[];
  /** Nada foi aprendido destes: precisam de confirmação na tela. */
  conflitos: PriceConflict[];
  /** Casou só por semelhança: pergunte antes de guardar. */
  pendentes: PendingMatch[];
}

/**
 * Peso ou peça. É a mistura que estraga a média: R$ 42,49 o quilo e R$ 17,00 a
 * peça não são o mesmo número. Já bandeja, caixa e pacote são todos peça, e
 * comparar 'bandeja' com 'cx' só geraria alarme falso.
 */
const bucket = (u: string): 'kg' | 'un' => (/^(kg|g)$/i.test(u) ? 'kg' : 'un');

export const hoje = (): string => new Date().toISOString().slice(0, 10);

/** Dias desde a última nota que trouxe este item, ou null se nunca soubemos. */
export function diasDesde(e: PriceEntry, ref = hoje()): number | null {
  if (!e.lastSeen) return null;
  const d = (Date.parse(ref) - Date.parse(e.lastSeen)) / 86400000;
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null;
}

/** Preço velho demais pra confiar no orçamento. Base antiga não sabe: false. */
export function isStale(e: PriceEntry, ref = hoje()): boolean {
  const d = diasDesde(e, ref);
  return d !== null && d > STALE_DIAS;
}

/**
 * Transforma linhas de nota em preços de referência.
 *
 * Duas contas, uma dentro da nota e outra entre notas:
 *
 * 1. dentro da nota, o preço observado é a média das linhas do mesmo item
 *    **ponderada pela quantidade** — 0,5 kg a 40 com 2 kg a 44 é 43,20, que é
 *    o que foi pago, e não 42 (defeito 5);
 * 2. entre notas, média exponencial com ALPHA sobre o preço observado, e cada
 *    nota conta como uma observação (defeito 3). A média corrida antiga nunca
 *    envelhecia: com n=20 um aumento real levava meses pra aparecer no número
 *    usado pra orçar.
 *
 * Linha cuja unidade é incompatível com a guardada não entra em conta nenhuma:
 * volta em `conflitos` pra confirmação na tela (defeito 4).
 */
type Agg = {
  val: number;
  qty: number;
  e: DicEntry | null;
  units: Set<string>;
  unit: string;
  /** Só nos pendentes: a descrição e o porquê da sugestão. */
  desc?: string;
  chave?: string;
  score?: number;
};

/** Soma uma linha na agregação daquele nome, ponderando pela quantidade. */
function acc(agg: Record<string, Agg>, key: string, r: NFRow, e: DicEntry | null): Agg {
  const un = bucket(r.unit);
  if (!agg[key]) agg[key] = { val: 0, qty: 0, e, units: new Set(), unit: r.unit };
  const a = agg[key];
  a.val += r.unitPrice * r.qty;
  a.qty += r.qty;
  a.units.add(un);
  // A unidade guardada é a do dicionário, exceto quando a nota discorda da
  // natureza dela: aí vale o que a nota diz.
  a.unit = e && bucket(e.u) === un ? e.u : r.unit;
  return a;
}

/** Preço observado da agregação, ou NaN quando não há o que aprender. */
const observado = (a: Agg): number => (a.qty > 0 ? a.val / a.qty : NaN);

/**
 * Guarda um preço observado sob um nome. Devolve o conflito de unidade em vez
 * de aplicar, quando a unidade não bate com a que já está lá.
 */
export function mergePrice(
  base: PriceBase,
  name: string,
  obs: number,
  unit: string,
  ref = hoje(),
): { base: PriceBase; novo: boolean; conflito: PriceConflict | null } {
  if (!Number.isFinite(obs) || obs <= 0) return { base, novo: false, conflito: null };
  const cur = base[name];
  if (cur && bucket(cur.unit) !== bucket(unit)) {
    return { base, novo: false, conflito: { name, unit, price: obs, unitAtual: cur.unit } };
  }
  const entry: PriceEntry = cur
    ? { ...cur, price: cur.price + ALPHA * (obs - cur.price), n: cur.n + 1, lastSeen: ref }
    : { price: obs, unit, n: 1, lastSeen: ref };
  return { base: { ...base, [name]: entry }, novo: !cur, conflito: null };
}

export function learnPrices(base: PriceBase, rows: NFRow[], ref = hoje()): LearnResult {
  const agg: Record<string, Agg> = {};
  const dif: Record<string, Agg> = {};

  for (const r of rows) {
    const res = resolve(r.desc);
    if (res.conf === 'difusa' && res.entry) {
      const a = acc(dif, res.name, r, res.entry);
      a.desc = a.desc || r.desc;
      a.chave = res.chave;
      a.score = res.score;
    } else {
      acc(agg, res.name, r, res.entry);
    }
  }

  let next: PriceBase = { ...base };
  const learned: LearnedPrice[] = [];
  const conflitos: PriceConflict[] = [];
  let novos = 0;
  let recal = 0;

  for (const [name, a] of Object.entries(agg)) {
    const obs = observado(a);
    if (!Number.isFinite(obs) || obs <= 0) continue;
    // A própria nota traz o item por peso e por peça: não há o que aprender.
    if (a.units.size > 1) {
      conflitos.push({ name, unit: a.unit, price: obs, unitAtual: null });
      continue;
    }
    const m = mergePrice(next, name, obs, a.unit, ref);
    if (m.conflito) {
      conflitos.push(m.conflito);
      continue;
    }
    next = m.base;
    if (m.novo) novos++;
    else recal++;
    learned.push({ name, entry: a.e, price: next[name].price });
  }

  const pendentes: PendingMatch[] = [];
  for (const [name, a] of Object.entries(dif)) {
    const obs = observado(a);
    if (!Number.isFinite(obs) || obs <= 0 || !a.e || !a.desc) continue;
    pendentes.push({
      desc: a.desc,
      name,
      entry: a.e,
      chave: a.chave || '',
      score: a.score || 0,
      price: obs,
      unit: a.unit,
      nameAlt: prettify(a.desc),
    });
  }

  return { base: next, novos, recal, learned, conflitos, pendentes };
}

/**
 * Registra o preço unitário digitado ao riscar um item da lista. É uma
 * observação, exatamente como uma nota fiscal é: mesma EWMA, mesmo ALPHA.
 *
 * O que esta função resolve além do `mergePrice` é a **correção**. Digitar
 * 42,90 no lugar de 4,29 e consertar chamaria a EWMA duas vezes, e o preço
 * usado pra orçar acabaria entre os dois valores. Por isso cada registro
 * carrega o `PriceEntry` que havia antes: corrigir restaura o anterior e só
 * então funde o valor novo. Sem replay de histórico, e exato.
 *
 * `obs` inválido ou não positivo significa campo apagado: desfaz e sai.
 */
export function registrarPago(
  base: PriceBase,
  pagos: Pagos,
  key: string,
  name: string,
  obs: number,
  unit: string,
  ref = hoje(),
): { base: PriceBase; pagos: Pagos; conflito: PriceConflict | null } {
  const antes = pagos[key];
  let limpa = base;
  if (antes) {
    limpa = { ...base };
    if (antes.prev) limpa[antes.name] = antes.prev;
    else delete limpa[antes.name];
  }

  if (!Number.isFinite(obs) || obs <= 0) {
    if (!antes) return { base, pagos, conflito: null };
    const { [key]: _, ...resto } = pagos;
    return { base: limpa, pagos: resto, conflito: null };
  }

  const m = mergePrice(limpa, name, obs, unit, ref);
  // Unidade incompatível: nada muda, nem o registro válido que já estava lá.
  if (m.conflito) return { base, pagos, conflito: m.conflito };

  const prev = limpa[name] ?? null;
  return {
    base: m.base,
    pagos: { ...pagos, [key]: { name, obs, unit, prev } },
    conflito: null,
  };
}

/**
 * Aplica um casamento difuso depois de o usuário confirmar. `name` permite
 * recusar a sugestão e guardar sob o nome próprio da descrição (`nameAlt`).
 */
export function aceitarPendente(
  base: PriceBase,
  p: PendingMatch,
  name = p.name,
  ref = hoje(),
): { base: PriceBase; novo: boolean; conflito: PriceConflict | null } {
  return mergePrice(base, name, p.price, p.unit, ref);
}
