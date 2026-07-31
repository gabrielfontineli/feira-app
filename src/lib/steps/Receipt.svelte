<script lang="ts">
  import Prompt from '../Prompt.svelte';
  import { brl2, norm } from '../format';
  import { parseNF } from '../parseNF';
  import { AVISO, NOTA } from '../prompts';
  import {
    aceitarPendente,
    isStale,
    learnPrices,
    STALE_DIAS,
    type PendingMatch,
    type PriceConflict,
  } from '../prices';
  import { allowed, itemFromDic } from '../quantity';
  import { feira } from '../state.svelte';
  import { toast } from '../toaster.svelte';

  let { go }: { go: (i: number) => void } = $props();

  let text = $state('');
  let error = $state('');
  let result = $state<{ lidas: number; novos: number; recal: number; add: number; ignoradas: number } | null>(null);
  let conflitos = $state<PriceConflict[]>([]);
  let pendentes = $state<PendingMatch[]>([]);

  const placeholder =
    '001\tFILE PEITO FGO SADIA BD 1KG\t1,0\tUN\t25,49\t0,00\t25,49\n' +
    '002\tARROZ BRANCO T1 PC 1KG\t2,0\tUN\t5,29\t0,00\t10,58';

  function read() {
    error = '';
    result = null;
    conflitos = [];
    pendentes = [];
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
    feira.base = lp.base;
    conflitos = lp.conflitos;
    pendentes = lp.pendentes;

    let add = 0;
    for (const { name, entry } of lp.learned) add += aplicar(name, entry);

    feira.cfg.started = 1;
    result = { lidas: rows.length, novos: lp.novos, recal: lp.recal, add, ignoradas: skipped.length };
  }

  /** Leva o preço aprendido pro item da lista, criando o item se não existir. */
  function aplicar(name: string, entry: PendingMatch['entry'] | null): number {
    const it = feira.itens.find((x) => norm(x.name) === norm(name));
    if (it) {
      it.price = Math.round(feira.base[name].price * 100) / 100;
      return 0;
    }
    if (entry && allowed(entry, feira.cfg)) {
      feira.itens.push(itemFromDic(entry, feira.cfg, feira.base));
      return 1;
    }
    return 0;
  }

  /** Confirma um casamento difuso: `name` é o sugerido ou o nome próprio. */
  function confirmar(p: PendingMatch, name: string) {
    const r = aceitarPendente(feira.base, p, name);
    pendentes = pendentes.filter((x) => x !== p);
    if (r.conflito) {
      conflitos = [...conflitos, r.conflito];
      return;
    }
    feira.base = r.base;
    aplicar(name, name === p.name ? p.entry : null);
    if (result) result[r.novo ? 'novos' : 'recal']++;
    toast.show(name + ': R$ ' + brl2(feira.base[name].price));
  }
</script>

<h2>colar a nota fiscal</h2>
<p class="small">
  Importação em lote, pra quando você tiver a nota inteira em mãos. No dia a dia é mais rápido digitar
  o preço na <b>lista</b>, ao riscar o item. Cada nota conta como uma observação e recalibra a média.
</p>
<div class="hintbox">
  Funciona com o formato tabelado das notas brasileiras: <b>item · descrição · qtde · unid · vl. unid ·
  desconto · vl. total</b>. Dá pra pegar esse texto no site da NFC-e, no app do mercado, ou
  fotografando o papel e usando o copiar-texto do próprio celular.
</div>
<Prompt
  texto={NOTA}
  aviso={AVISO}
  chamada="O copiar-texto do celular embaralhou as colunas? Mande a foto do cupom pra uma LLM com
  este pedido: ela devolve as colunas do jeito que o app lê."
/>
<textarea bind:value={text} {placeholder}></textarea>
<div class="btnrow">
  <button class="btn primary" onclick={read}>Ler nota fiscal</button>
  <button class="btn ghost" onclick={() => go(5)}>Voltar</button>
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
  {#if pendentes.length}
    <div class="hintbox">
      <b>Isto é o mesmo item?</b> Não guardei o preço destas linhas porque a descrição
      só se parece com o que está no dicionário. Um palpite errado aqui estraga o
      preço de outro item.
    </div>
    {#each pendentes as p (p.desc)}
      <div class="pend">
        <div class="small"><b>{p.desc}</b> · R$ {brl2(p.price)} / {p.unit}</div>
        <div class="btnrow" style="margin-top:7px">
          <button class="btn primary" onclick={() => confirmar(p, p.name)}>
            É {p.name}
          </button>
          <button class="btn ghost" onclick={() => confirmar(p, p.nameAlt)}>
            Guardar como “{p.nameAlt}”
          </button>
          <button class="btn ghost" onclick={() => (pendentes = pendentes.filter((x) => x !== p))}>
            Ignorar
          </button>
        </div>
      </div>
    {/each}
  {/if}

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
      <span class="chip">
        {name} · R$ {brl2(entry.price)}
        <!-- Preço que não aparece em nota há muito tempo não serve pra orçar. -->
        {#if isStale(entry)}<span class="velho" title="sem nota há mais de {STALE_DIAS} dias">
            · antigo
          </span>{/if}
      </span>
    {/each}
  </div>
  <div class="btnrow">
    <button class="btn primary" onclick={() => go(4)}>Ir pra lista →</button>
  </div>
{/if}

<style>
  .pend{border:1px solid var(--line);border-left:3px solid var(--coral);border-radius:12px;
    padding:11px 13px;margin:8px 0;background:var(--card)}
  .pend .btnrow{margin-bottom:0}
  .velho{color:var(--coral)}
</style>
