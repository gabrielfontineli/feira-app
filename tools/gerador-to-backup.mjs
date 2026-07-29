/*
 * Tira SEED_RAW / SEED_BASE / cfg do gerador-lista.html e escreve um backup
 * .json que o app importa direto — é o caminho pra trazer a lista real de vocês
 * pro app novo sem digitar nada de novo.
 *
 *   node tools/gerador-to-backup.mjs [gerador-lista.html] [saida.json]
 *
 * Os ids saem do nome (slug), não aleatórios: assim reimportar o mesmo arquivo
 * não perde as marcações de compra.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2] || 'gerador-lista.html';
const out = process.argv[3] || 'feira-backup-gerador.json';
const html = readFileSync(src, 'utf8');

/** Lê um literal JS do arquivo pelo nome da const. */
function literal(name, open, close) {
  const re = new RegExp(`const ${name}\\s*=\\s*(\\${open}[\\s\\S]*?\\n\\${close})\\s*;`);
  const m = html.match(re);
  if (!m) throw new Error(`não achei ${name} em ${src}`);
  return new Function(`return ${m[1]}`)();
}

const SEED_BASE = literal('SEED_BASE', '{', '}');
const SEED_RAW = literal('SEED_RAW', '[', ']');

const cfgMatch = html.match(/let cfg=(\{[^}]*\});/);
if (!cfgMatch) throw new Error('não achei o cfg em ' + src);
const cfg = { ...new Function(`return ${cfgMatch[1]}`)(), started: 1 };

const slug = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const seen = new Set();
const itens = SEED_RAW.map((r) => {
  const id = slug(r[0]);
  if (seen.has(id)) throw new Error('dois itens com o mesmo nome: ' + r[0]);
  seen.add(id);
  return {
    id,
    name: r[0],
    cat: r[1],
    freq: r[2],
    qty: r[3],
    unit: r[4],
    price: r[5],
    cook: !!r[6],
    on: !!r[7],
    nota: r[8] || '',
  };
});

const backup = {
  app: 'feira',
  v: 1,
  exportado: new Date().toISOString(),
  cfg,
  itens,
  base: SEED_BASE,
  checks: {},
};

writeFileSync(out, JSON.stringify(backup, null, 2) + '\n');

const on = itens.filter((i) => i.on);
const raw = (i) => (i.cook ? i.qty / (1 - cfg.loss / 100) : i.qty);
const total = on.reduce((s, i) => s + raw(i) * (i.price || 0), 0);
console.log(`${out}: ${itens.length} itens (${on.length} ligados), ${Object.keys(SEED_BASE).length} preços`);
console.log(`total do mês: R$ ${total.toFixed(2)} · orçamento R$ ${cfg.vale}`);
