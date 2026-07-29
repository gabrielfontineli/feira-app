/** Número no formato pt-BR das notas: '1.052,80' -> 1052.8 */
export function toNum(s: string | number | null | undefined): number {
  if (!s) return NaN;
  const v = parseFloat(String(s).trim().replace(/\./g, '').replace(',', '.'));
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
