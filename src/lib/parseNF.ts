import { toNum } from './format';
import type { NFRow } from './types';

export const UNITS = /^(un|unid|unidade|kg|g|pacote|pct|pc|cx|lt|l|ml|dz|fardo|rolo|pote|lata|fd)$/i;

/** Linhas de cabeçalho, total e pagamento que não são item. */
const NOISE =
  /valor total|valor descont|valor pago|forma pagament|cart[aã]o|n[aã]o catalogado|^item\b|descri[çc]|total geral|troco|cnpj|cpf/i;

export interface ParseResult {
  rows: NFRow[];
  skipped: string[];
}

/**
 * Acha a coluna de unidade: o token mais à direita que é unidade e tem número
 * dos dois lados (quantidade à esquerda, preço unitário à direita).
 *
 * Da direita pra esquerda porque 'PC', 'CX' e 'KG' também aparecem no meio da
 * descrição — `ARROZ BRANCO T1 PC 1KG 2,0 UN 5,29` tem duas unidades, e a que
 * abre a coluna de números é sempre a última. Devolve -1 quando não há coluna.
 */
function unitIndex(t: string[]): number {
  for (let i = t.length - 2; i >= 1; i--) {
    if (!UNITS.test(t[i])) continue;
    if (isNaN(toNum(t[i - 1])) || isNaN(toNum(t[i + 1]))) continue;
    return i;
  }
  return -1;
}

/**
 * Lê o texto tabelado de uma nota fiscal brasileira:
 * item · descrição · qtde · unid · vl. unid · desconto · vl. total
 *
 * Estrutura portada de feira-app.html:539-556. A busca da coluna de unidade
 * foi corrigida na fase 2 (defeito 1): antes pegava o primeiro token que
 * casava com UNITS, o que quebrava toda nota separada por espaço simples.
 */
export function parseNF(text: string): ParseResult {
  const out: NFRow[] = [];
  const skipped: string[] = [];
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (NOISE.test(line)) {
      skipped.push(line);
      return;
    }
    let t = line.split(/\t+|\s{2,}/).map((s) => s.trim()).filter(Boolean);
    if (t.length < 4) t = line.split(/\s+/);
    const ui = unitIndex(t);
    if (ui < 0) {
      skipped.push(line);
      return;
    }
    const start = /^\d{1,4}$/.test(t[0]) ? 1 : 0;
    const desc = t.slice(start, ui - 1).join(' ').replace(/\s*\.$/, '').trim();
    const qty = toNum(t[ui - 1]);
    const unitPrice = toNum(t[ui + 1]);
    if (!desc || unitPrice <= 0) {
      skipped.push(line);
      return;
    }
    // Linha de brinde ou ajuste vem com quantidade zero: conta como uma, senão
    // a média ponderada da nota perde a linha inteira.
    out.push({ desc, qty: qty > 0 ? qty : 1, unit: t[ui].toLowerCase(), unitPrice });
  });
  return { rows: out, skipped };
}
