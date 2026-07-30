import { DIC } from './dic';
import { norm, prettify } from './format';
import type { DicEntry, Item } from './types';

export interface Sugestao {
  /** Nome que o item vai receber. */
  name: string;
  /** Entrada do dicionário, quando veio de lá. Null: texto livre. */
  entry: DicEntry | null;
  /** Item que já existe com este nome. Ligar em vez de criar outro. */
  existente: Item | null;
}

/**
 * Sugere o que adicionar à lista a partir do que foi digitado. O dicionário já
 * sabe categoria, unidade, frequência e quantidade mensal de cada item — usar
 * isso aqui é o que transforma seis campos preenchidos à mão num toque.
 *
 * De propósito **não** aplica `allowed()`: os interruptores de limpeza, higiene
 * e extras filtram o que o app sugere sozinho a partir da dieta. Aqui foi você
 * que escreveu o nome, então pedir detergente com a limpeza desligada acha
 * detergente.
 */
export function sugerir(q: string, itens: Item[], limite = 5): Sugestao[] {
  const t = norm(q).trim();
  if (!t) return [];

  // Exato, depois prefixo, depois substring. 'maca' escrito inteiro é a maçã,
  // não o macarrão que só começa igual; e 'pao' é o pão francês, não o filé de
  // frango que casa por dentro da chave 'peito de frango'.
  const achados: { e: DicEntry; peso: number }[] = [];
  for (const e of DIC) {
    let peso = 0;
    for (const alvo of [e.n, ...e.k].map((s) => norm(s).trim())) {
      if (alvo === t) peso = Math.max(peso, 3);
      else if (alvo.startsWith(t)) peso = Math.max(peso, 2);
      else if (alvo.includes(t)) peso = Math.max(peso, 1);
    }
    if (peso > 0) achados.push({ e, peso });
  }
  achados.sort((a, b) => b.peso - a.peso);

  const porNome = new Map(itens.map((i) => [norm(i.name), i]));
  const out = achados
    .slice(0, limite)
    .map(({ e }) => ({ name: e.n, entry: e, existente: porNome.get(norm(e.n)) ?? null }));

  if (out.length) return out;

  // Nada no dicionário: vira item avulso com o nome que foi digitado.
  const livre = prettify(q.trim());
  return [{ name: livre, entry: null, existente: porNome.get(norm(livre)) ?? null }];
}
