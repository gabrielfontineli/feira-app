import { DIC } from './dic';
import { norm, prettify } from './format';
import type { DicEntry } from './types';

/*
 * Casamento entre descrição de nota fiscal e o dicionário.
 *
 * Mora fora de parseNF.ts de propósito: ler a nota é uma coisa, decidir de que
 * produto a linha fala é outra. O parser não conhece o dicionário, e este
 * módulo não conhece o formato da nota.
 */

/** Primeira entrada do dicionário cuja palavra-chave aparece na descrição. */
export function matchDic(s: string): DicEntry | null {
  const d = norm(s);
  for (const e of DIC) for (const k of e.k) if (d.includes(norm(k))) return e;
  return null;
}

/**
 * Semelhança mínima pra valer uma pergunta na tela. Calibrado com descrições
 * abreviadas de verdade: os acertos ficam entre 0,56 ('ABSORVNT NOTURNO') e
 * 0,87 ('GRAO DE BIC'), e a maior parte do lixo fica abaixo.
 *
 * O limite mira em "vale perguntar", não em "certamente é": nada que vem por
 * aqui entra na base sem você confirmar, então errar pra mais custa uma
 * pergunta e errar pra menos custa um preço perdido.
 */
export const MIN_SCORE = 0.55;

/** Chave curta demais casa com qualquer coisa: só gera pergunta besta. */
const MIN_CHAVE = 4;

const tri = (s: string): Set<string> => {
  const t = ' ' + norm(s).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  const out = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
};

/** Coeficiente de Dice entre dois conjuntos de trigramas: 0 a 1. */
const dice = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const g of a) if (b.has(g)) n++;
  return (2 * n) / (a.size + b.size);
};

/** Trechos da descrição com o mesmo número de palavras que a chave. */
const janelas = (desc: string, nPalavras: number): string[] => {
  const w = norm(desc).replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
  const out: string[] = [];
  for (let i = 0; i + nPalavras <= w.length; i++) out.push(w.slice(i, i + nPalavras).join(' '));
  return out.length ? out : [w.join(' ')];
};

export interface FuzzyHit {
  entry: DicEntry;
  /** Chave do dicionário que casou — mostra por que o app achou isso. */
  chave: string;
  /** 0 a 1. */
  score: number;
}

/**
 * Entrada mais parecida com a descrição, por trigrama, quando nenhuma
 * palavra-chave aparece literalmente. Substitui a heurística de "três primeiras
 * palavras" do prettify como jeito de reconhecer o produto: 'FILE DE FRAGO' e
 * 'MUSARELA FATIADA' são erros de digitação da nota, não produtos novos.
 *
 * A comparação é por janela de palavras do mesmo tamanho da chave, e não
 * descrição inteira contra chave: senão a chave curta ganha de tudo.
 */
export function fuzzyDic(desc: string): FuzzyHit | null {
  let best: FuzzyHit | null = null;
  for (const e of DIC) {
    for (const k of [...e.k, e.n]) {
      const kn = norm(k).trim();
      if (kn.length < MIN_CHAVE) continue;
      const kt = tri(kn);
      for (const w of janelas(desc, kn.split(/\s+/).length)) {
        const score = dice(tri(w), kt);
        if (score > (best?.score ?? 0)) best = { entry: e, chave: k, score };
      }
    }
  }
  return best && best.score >= MIN_SCORE ? best : null;
}

export type Confianca = 'exata' | 'difusa' | 'nenhuma';

export interface Resolved {
  entry: DicEntry | null;
  /** Nome sob o qual guardar o preço. */
  name: string;
  conf: Confianca;
  chave?: string;
  score?: number;
}

/**
 * De que produto esta linha da nota fala. Três respostas possíveis: casou
 * literalmente, casou por semelhança (precisa de confirmação), ou é produto
 * novo mesmo — e aí o nome sai do prettify, que é o que ele sabe fazer.
 */
export function resolve(desc: string): Resolved {
  const e = matchDic(desc);
  if (e) return { entry: e, name: e.n, conf: 'exata' };
  const f = fuzzyDic(desc);
  if (f) {
    return { entry: f.entry, name: f.entry.n, conf: 'difusa', chave: f.chave, score: f.score };
  }
  return { entry: null, name: prettify(desc), conf: 'nenhuma' };
}
