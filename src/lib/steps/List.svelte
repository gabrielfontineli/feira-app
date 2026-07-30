<script lang="ts">
  import { checkKey } from '../checks';
  import { copyText } from '../clipboard';
  import { CATORDER, FREQ, MESES } from '../dic';
  import { brl0, brl2, toNum } from '../format';
  import { byCategory } from '../group';
  import { idasNoMes, itemCost, qtyPorIda, rawQty } from '../quantity';
  import { feira } from '../state.svelte';
  import { toast } from '../toaster.svelte';
  import type { Freq, Item } from '../types';

  const ORDER: Freq[] = ['mes', 'quinzena', 'semana'];

  let open = $state<Record<Freq, boolean>>({ mes: true, quinzena: true, semana: true });

  const on = $derived(feira.itens.filter((i) => i.on));
  const sections = $derived(
    ORDER.map((f) => ({ f, list: on.filter((i) => i.freq === f) })).filter((s) => s.list.length),
  );
  const total = $derived(on.reduce((s, i) => s + itemCost(i, feira.cfg), 0));
  const spent = $derived(
    on.filter((i) => feira.isChecked(i)).reduce((s, i) => s + itemCost(i, feira.cfg), 0),
  );
  const done = $derived(on.filter((i) => feira.isChecked(i)).length);
  const sobra = $derived(feira.cfg.vale - total);
  const pct = $derived(on.length ? Math.round((done / on.length) * 100) : 0);

  /** Número com vírgula, sem zero à direita: 1.1666 -> '1,17', 5 -> '5'. */
  const q = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  /**
   * O número grande é o que levar nesta ida, em peso cru — é a decisão de
   * compra. O total do mês e o peso cozido correspondente vão na nota, porque
   * um número com dois significados não dizia qual era qual (defeitos 6 e 10).
   */
  const qtyLabel = (i: Item) =>
    idasNoMes(i.freq, feira.cfg) > 1
      ? q(qtyPorIda(i, feira.cfg)) + ' ' + i.unit + ' por ida'
      : q(rawQty(i, feira.cfg)) + ' ' + i.unit;

  const noteLabel = (i: Item) =>
    [
      idasNoMes(i.freq, feira.cfg) > 1 ? q(rawQty(i, feira.cfg)) + ' ' + i.unit + ' no mês' : '',
      i.cook ? 'peso cru · rende ' + q(i.qty) + ' ' + i.unit + ' cozido' : '',
      i.nota || '',
    ]
      .filter(Boolean)
      .join(' · ');

  /** O que já foi digitado pra este item neste mês, pra reabrir preenchido. */
  const pagoDe = (i: Item) => {
    const p = feira.pagos[checkKey(i)];
    return p ? brl2(p.obs) : '';
  };

  /**
   * Guarda o preço unitário digitado. Campo vazio desfaz o registro do mês —
   * é o jeito de corrigir sem que a média conte a digitação errada.
   */
  function registrar(i: Item, el: HTMLInputElement) {
    const conflito = feira.registrarPreco(i, toNum(el.value));
    if (!conflito) {
      el.value = pagoDe(i);
      return;
    }
    el.value = '';
    toast.show(
      `${i.name} está guardado por ${conflito.unitAtual}. Ajuste a unidade em itens.`,
    );
  }

  async function copy() {
    let txt = '🛒 Lista de ' + MESES[feira.ym.m] + ' ' + feira.ym.y + '\n';
    for (const { f, list } of sections) {
      txt += '\n— ' + FREQ[f].t.toUpperCase() + ' —\n';
      for (const i of list) {
        txt += (feira.isChecked(i) ? '[x] ' : '[ ] ') + i.name + ' · ' + qtyLabel(i) + '\n';
      }
    }
    txt += '\nTotal estimado: ' + brl0(total);
    if (await copyText(txt)) toast.show('Lista copiada');
    else alert(txt);
  }

  async function resetMonth() {
    if (!confirm('Limpar as marcações de ' + MESES[feira.ym.m] + '?')) return;
    await feira.resetMonth();
    toast.show('Mês zerado');
  }
</script>

<div class="panel noprint" style="margin-bottom:11px">
  <div class="month">
    <button class="mbtn" onclick={() => feira.goMonth(-1)} aria-label="mês anterior">←</button>
    <div class="mname">{MESES[feira.ym.m]} {feira.ym.y}</div>
    <button class="mbtn" onclick={() => feira.goMonth(1)} aria-label="mês seguinte">→</button>
  </div>
  <div style="text-align:center">
    <button class="btn ghost" style="font-size:12px;padding:7px 13px" onclick={() => feira.today()}>
      mês atual
    </button>
  </div>
</div>

<div class="summary">
  <div class="s"><div class="k">comprado</div><div class="v num">{done} / {on.length}</div></div>
  <div class="s"><div class="k">marcado</div><div class="v num">{brl0(spent)}</div></div>
  <div class="s"><div class="k">lista toda</div><div class="v num">{brl0(total)}</div></div>
  <div class="s">
    <div class="k">orçamento</div>
    {#if feira.cfg.vale > 0}
      <div class="v num" class:ok={sobra >= 0} class:warn={sobra < 0}>
        {sobra >= 0 ? 'sobra ' : 'passa '}{brl0(Math.abs(sobra))}
      </div>
    {:else}
      <div class="v num">—</div>
    {/if}
  </div>
  <div class="pbar"><i style="width:{pct}%"></i></div>
</div>

{#if !on.length}
  <div class="panel">
    <p class="small">
      Sua lista está vazia. Vá em <b>itens</b> pra adicionar, ou em <b>início</b> pra carregar um exemplo.
    </p>
  </div>
{:else}
  {#each sections as { f, list } (f)}
    <div class="fsec">
      <button class="fhead" onclick={() => (open[f] = !open[f])} aria-expanded={open[f]}>
        <div>
          <span class="tag">{FREQ[f].t}</span>
          <h4>{FREQ[f].h}</h4>
        </div>
        <span class="cnt">{list.filter((i) => feira.isChecked(i)).length}/{list.length}</span>
      </button>
      {#if open[f]}
        <div>
          {#each byCategory(list) as [cat, items] (cat)}
            <div class="catlabel" style="margin:12px 0 4px 12px">{cat}</div>
            {#each items as i (i.id)}
              <div class="item" class:done={feira.isChecked(i)}>
                <button
                  class="tick"
                  role="checkbox"
                  aria-checked={feira.isChecked(i)}
                  onclick={() => feira.toggle(i)}
                >
                  <span class="cbx">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span class="lbl">
                    {i.name}
                    {#if noteLabel(i)}<span class="note">{noteLabel(i)}</span>{/if}
                  </span>
                  <span class="qp">
                    <span class="qty">{qtyLabel(i)}</span>
                    {#if i.price}<span class="prc num">{brl0(itemCost(i, feira.cfg))}</span>{/if}
                  </span>
                </button>
                <!-- O campo só nasce depois de marcar: andando pelo mercado a
                     lista fica limpa, e não vira uma parede de inputs no
                     celular. Digitar é opcional — o placeholder já mostra o
                     preço de referência que o orçamento está usando. -->
                {#if feira.isChecked(i)}
                  <label class="paid noprint">
                    <span>R$ / {i.unit}</span>
                    <input
                      type="text"
                      inputmode="decimal"
                      enterkeyhint="done"
                      placeholder={brl2(feira.base[i.name]?.price ?? i.price)}
                      value={pagoDe(i)}
                      onchange={(e) => registrar(i, e.currentTarget)}
                    />
                  </label>
                {/if}
              </div>
            {/each}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
{/if}

<div class="panel noprint">
  <div class="btnrow" style="margin-top:0">
    <button class="btn" onclick={copy}>Copiar como texto</button>
    <button class="btn" onclick={() => window.print()}>Imprimir / PDF</button>
    <button class="btn danger" onclick={resetMonth}>Recomeçar o mês</button>
  </div>
</div>

<style>
  .month{display:flex;align-items:center;gap:9px;margin:2px 0 8px}
  .mbtn{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:15px;cursor:pointer;color:var(--ink);flex:none}
  .mbtn:hover{border-color:var(--green);color:var(--green-deep)}
  .mname{font-family:'Fraunces',serif;font-weight:600;font-size:19px;text-transform:lowercase;flex:1;text-align:center}

  .summary{position:sticky;top:8px;z-index:30;background:var(--ink);color:#f2f4ec;border-radius:14px;
    padding:12px 15px;display:flex;gap:8px 16px;flex-wrap:wrap;margin:0 0 13px;box-shadow:0 8px 24px rgba(38,50,42,.18)}
  .summary .s{flex:1 1 92px}
  .summary .k{font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.72}
  .summary .v{font-family:'Space Mono',monospace;font-weight:700;font-size:15.5px;margin-top:2px}
  .summary .v.ok{color:#8fd8ab}
  .summary .v.warn{color:#f5b08c}
  .pbar{height:5px;border-radius:99px;background:rgba(255,255,255,.15);overflow:hidden;flex-basis:100%;margin-top:3px}
  .pbar i{display:block;height:100%;background:var(--coral);border-radius:99px;transition:width .3s}

  .fsec{border:1px solid var(--line);border-radius:14px;margin:11px 0;overflow:hidden;background:var(--card);box-shadow:var(--shadow)}
  .fhead{width:100%;font-family:inherit;text-align:left;padding:13px 15px;background:var(--green-soft);border:none;border-bottom:1px solid var(--line);
    display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;user-select:none}
  .fhead .tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    color:#fff;background:var(--green);padding:3px 9px;border-radius:999px;margin-bottom:5px}
  .fhead h4{font-family:'Fraunces',serif;font-weight:600;font-size:17px;margin:0;text-transform:lowercase}
  .fhead .cnt{font-family:'Space Mono',monospace;font-size:12.5px;color:var(--green-deep);flex:none}

  .item + .item{border-top:1px solid #f1f3ec}
  .tick{width:100%;font-family:inherit;text-align:left;background:none;border:none;
    display:flex;align-items:center;gap:12px;padding:11px 12px;cursor:pointer;color:inherit}
  .tick:active{background:#f0f3ea}
  .cbx{width:24px;height:24px;border:2px solid var(--green);border-radius:7px;flex:none;display:grid;place-items:center;transition:.15s}
  .cbx svg{width:13px;height:13px;opacity:0;transform:scale(.5);transition:.15s}
  .item.done .cbx{background:var(--green);border-color:var(--green)}
  .item.done .cbx svg{opacity:1;transform:scale(1)}
  .item .lbl{flex:1;font-size:15px}
  .item .note{display:block;font-size:11px;color:var(--green);font-family:'Space Mono',monospace;margin-top:1px}
  .item .qp{text-align:right;white-space:nowrap}
  .item .qty{font-family:'Space Mono',monospace;font-size:12.5px;color:var(--muted);display:block}
  .item .prc{font-family:'Space Mono',monospace;font-size:12.5px;color:var(--green-deep);font-weight:700}
  .item.done .lbl,.item.done .qty,.item.done .prc{text-decoration:line-through;color:var(--muted)}

  .paid{display:flex;align-items:center;gap:8px;padding:0 12px 11px 48px}
  .paid span{font-family:'Space Mono',monospace;font-size:12px;color:var(--muted);flex:none}
  .paid input{flex:1;min-width:0;padding:8px 10px;text-align:right;
    font-family:'Space Mono',monospace}
</style>
