<script lang="ts">
  import AddItem from '../AddItem.svelte';
  import { brl0, norm } from '../format';
  import { byCategory } from '../group';
  import { itemCost } from '../quantity';
  import { feira } from '../state.svelte';
  import ItemCard from './ItemCard.svelte';

  let { go }: { go: (i: number) => void } = $props();

  let busca = $state('');

  const achados = $derived(
    busca.trim()
      ? feira.itens.filter((i) => norm(i.name).includes(norm(busca).trim()))
      : feira.itens,
  );
  const groups = $derived(byCategory(achados));
  // `naLista` e não `i.on`: avulso de mês passado não entra no total do mês.
  const on = $derived(feira.itens.filter((i) => feira.naLista(i)));
  const total = $derived(on.reduce((s, i) => s + itemCost(i, feira.cfg), 0));
  const grande = $derived(
    on.filter((i) => i.freq === 'mes').reduce((s, i) => s + itemCost(i, feira.cfg), 0),
  );
  const reposicao = $derived(total - grande);
  const sobra = $derived(feira.cfg.vale - total);

  function wipe() {
    if (!confirm('Remover todos os itens? Os preços aprendidos continuam salvos.')) return;
    feira.itens = [];
  }
</script>

<div class="panel">
  <h2>3 · ajustar os itens</h2>
  <p class="small">
    Mude nome, quantidade, preço e frequência. O interruptor da esquerda tira o item da lista sem apagar.
    <b>Coz.</b> = perde peso ao cozinhar, então o app calcula quanto comprar cru.
  </p>
  <AddItem />
  <input class="busca" type="text" bind:value={busca} placeholder="buscar item…" />
  <div class="btnrow">
    <button class="btn danger" onclick={wipe}>Limpar itens</button>
  </div>
  <div class="totals">
    <div class="tcard"><div class="k">itens ativos</div><div class="v">{on.length}</div></div>
    <div class="tcard"><div class="k">compra grande</div><div class="v">{brl0(grande)}</div></div>
    <div class="tcard"><div class="k">reposições</div><div class="v">{brl0(reposicao)}</div></div>
    <div class="tcard"><div class="k">total do mês</div><div class="v">{brl0(total)}</div></div>
    {#if feira.cfg.vale > 0}
      <div class="tcard" class:coral={sobra < 0}>
        <div class="k">{sobra < 0 ? 'passa do orçamento' : 'sobra'}</div>
        <div class="v">{brl0(Math.abs(sobra))}</div>
      </div>
    {/if}
  </div>
</div>

{#if !achados.length}
  <div class="panel">
    <p class="small">
      {#if busca.trim()}
        Nenhum item com “{busca}”.
      {:else}
        Nenhum item ainda. Use <b>+ adicionar item</b>, ou volte e cole a lista da dieta.
      {/if}
    </p>
  </div>
{:else}
  {#each groups as [cat, list] (cat)}
    <div class="catlabel">{cat}</div>
    {#each list as item (item.id)}
      <ItemCard
        {item}
        aberto={!!busca.trim()}
        remove={() => (feira.itens = feira.itens.filter((x) => x.id !== item.id))}
      />
    {/each}
  {/each}
{/if}

<div class="panel">
  <div class="btnrow" style="margin-top:0">
    <button class="btn primary" onclick={() => go(4)}>Gerar a lista →</button>
  </div>
</div>

<style>
  .busca{margin-top:9px}
</style>
