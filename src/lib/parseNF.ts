import { DIC } from './dic';
import { norm, toNum } from './format';
import type { DicEntry, NFRow } from './types';

export const UNITS = /^(un|unid|unidade|kg|g|pacote|pct|pc|cx|lt|l|ml|dz|fardo|rolo|pote|lata|fd)$/i;

/** Linhas de cabeçalho, total e pagamento que não são item. */
const NOISE =
  /valor total|valor descont|valor pago|forma pagament|cart[aã]o|n[aã]o catalogado|^item\b|descri[çc]|total geral|troco|cnpj|cpf/i;

export interface ParseResult {
  rows: NFRow[];
  skipped: string[];
}

/**
 * Lê o texto tabelado de uma nota fiscal brasileira:
 * item · descrição · qtde · unid · vl. unid · desconto · vl. total
 *
 * Portado sem mudança de feira-app.html:539-556 — inclusive os defeitos
 * conhecidos (a busca de unidade pega o primeiro token que casa, e toNum
 * não distingue decimal com ponto). Corrigidos na fase 2, com teste antes.
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
    const ui = t.findIndex((x) => UNITS.test(x));
    if (ui < 1) {
      skipped.push(line);
      return;
    }
    const start = /^\d{1,4}$/.test(t[0]) ? 1 : 0;
    const desc = t.slice(start, ui - 1).join(' ').replace(/\s*\.$/, '').trim();
    const qty = toNum(t[ui - 1]);
    const unitPrice = toNum(t[ui + 1]);
    if (!desc || isNaN(unitPrice) || unitPrice <= 0) {
      skipped.push(line);
      return;
    }
    out.push({ desc, qty: isNaN(qty) ? 1 : qty, unit: t[ui].toLowerCase(), unitPrice });
  });
  return { rows: out, skipped };
}

/** Primeira entrada do dicionário cuja palavra-chave aparece na descrição. */
export function matchDic(s: string): DicEntry | null {
  const d = norm(s);
  for (const e of DIC) for (const k of e.k) if (d.includes(norm(k))) return e;
  return null;
}
