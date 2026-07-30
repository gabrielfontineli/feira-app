/**
 * Número como as notas escrevem: '1.052,80' -> 1052.8, '25.49' -> 25.49.
 *
 * O separador decimal é o último `,` ou `.` do token; os anteriores são de
 * milhar. Isso deixa '1.052' valer 1,052 e não 1052 — aceitável porque os
 * campos lidos da nota são quantidade e preço unitário, onde valor acima de mil
 * não existe, enquanto '25.49' virando 2549 envenenava a base de preço.
 *
 * Estrito de propósito: só devolve número se o token for inteiramente
 * numérico. '1KG' e 'T1' viram NaN em vez de 1, o que impede a linha mal
 * fatiada de entrar como preço.
 */
export function toNum(s: string | number | null | undefined): number {
  if (typeof s === 'number') return Number.isFinite(s) ? s : NaN;
  if (!s) return NaN;
  const t = String(s).trim();
  const dec = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'));
  const norm = dec < 0 ? t : t.slice(0, dec).replace(/[.,]/g, '') + '.' + t.slice(dec + 1);
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(norm)) return NaN;
  const v = parseFloat(norm);
  return isNaN(v) ? NaN : v;
}

export const brl0 = (n: number): string => 'R$ ' + Math.round(n || 0).toLocaleString('pt-BR');

export const brl2 = (n: number): string =>
  (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const nid = (): string => 'x' + Math.random().toString(36).slice(2, 8);

/** Minúsculas sem acento, pra comparar descrição de nota com o dicionário. */
export const norm = (s: string): string =>
  String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Descrição de nota que não casou com o dicionário: 3 primeiras palavras. */
export function prettify(d: string): string {
  const w = d.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
  return w.charAt(0).toUpperCase() + w.slice(1);
}
