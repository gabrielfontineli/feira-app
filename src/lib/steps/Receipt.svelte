<script lang="ts">
  import { brl2, norm } from '../format';
  import { parseNF } from '../parseNF';
  import { learnPrices, type PriceConflict } from '../prices';
  import { allowed, itemFromDic } from '../quantity';
  import { feira } from '../state.svelte';

  let { go }: { go: (i: number) => void } = $props();

  let text = $state('');
  let error = $state('');
  let result = $state<{ lidas: number; novos: number; recal: number; add: number; ignoradas: number } | null>(null);
  let conflitos = $state<PriceConflict[]>([]);

  const placeholder =
    '001\tFILE PEITO FGO SADIA BD 1KG\t1,0\tUN\t25,49\t0,00\t25,49\n' +
    '002\tARROZ BRANCO T1 PC 1KG\t2,0\tUN\t5,29\t0,00\t10,58';

  function read() {
    error = '';
    result = null;
    conflitos = [];
    if (!text.trim()) {
      error = 'Cole o texto da nota primeiro.';
      return;
    }
    const { rows, skipped } = parseNF(text);
    if (!rows.length) {
      error =
        'Não consegui identificar itens. Cada linha precisa ter descrição, quantidade, unidade (UN/KG) e preço unitário.';
      return;
    }

    const lp = learnPrices(feira.base, rows);
    const { base, novos, recal, learned } = lp;
    feira.base = base;
    conflitos = lp.conflitos;

    let add = 0;
    for (const { name, entry } of learned) {
      const it = feira.itens.find((x) => norm(x.name) === norm(name));
      if (it) {
        it.price = Math.round(base[name].price * 100) / 100;
        continue;
      }
      if (entry && allowed(entry, feira.cfg)) {
        feira.itens.push(itemFromDic(entry, feira.cfg, base));
        add++;
      }
    }

    feira.cfg.started = 1;
    result = { lidas: rows.length, novos, recal, add, ignoradas: skipped.length };
  }
</script>

<h2>1 · colar a nota fiscal</h2>
<p class="small">
  Cole o texto da nota do mercado. O app identifica descrição, quantidade e preço unitário, e guarda como
  preço de referência. Cada nota nova recalibra a média.
</p>
<div class="hintbox">
  Funciona com o formato tabelado das notas brasileiras: <b>item · descrição · qtde · unid · vl. unid ·
  desconto · vl. total</b>. Dá pra pegar esse texto no site da NFC-e ou no app do mercado.
</div>
<textarea bind:value={text} {placeholder}></textarea>
<div class="btnrow">
  <button class="btn primary" onclick={read}>Ler nota fiscal</button>
  <button class="btn ghost" onclick={() => go(2)}>Pular →</button>
</div>

{#if error}
  <div class="warnbox">{error}</div>
{/if}

{#if result}
  <div class="hintbox">
    <b>{result.lidas} linhas lidas.</b>
    {result.novos} preços novos, {result.recal} recalibrados, {result.add} itens adicionados.
    {#if result.ignoradas}
      <span style="color:var(--muted)">({result.ignoradas} linhas ignoradas)</span>
    {/if}
  </div>
  {#if conflitos.length}
    <div class="warnbox">
      <b>Unidade não bate, preço não foi aprendido.</b>
      {#each conflitos as c (c.name)}
        <div class="small">
          {c.name}: a nota traz R$ {brl2(c.price)} por {c.unit}{c.unitAtual
            ? ', mas o preço guardado é por ' + c.unitAtual
            : ', e por outra unidade na mesma nota'}. Ajuste na mão em <b>itens</b> se
          a unidade mudou de verdade.
        </div>
      {/each}
    </div>
  {/if}

  <h3>preços na memória</h3>
  <div>
    {#each Object.entries(feira.base) as [name, entry] (name)}
      <span class="chip">{name} · R$ {brl2(entry.price)}</span>
    {/each}
  </div>
  <div class="btnrow">
    <button class="btn primary" onclick={() => go(2)}>Continuar →</button>
  </div>
{/if}
