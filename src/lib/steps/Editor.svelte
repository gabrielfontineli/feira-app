<script lang="ts">
  import { brl0, nid } from '../format';
  import { byCategory } from '../group';
  import { itemCost } from '../quantity';
  import { feira } from '../state.svelte';
  import ItemCard from './ItemCard.svelte';

  let { go }: { go: (i: number) => void } = $props();

  const groups = $derived(byCategory(feira.itens));
  const on = $derived(feira.itens.filter((i) => i.on));
  const total = $derived(on.reduce((s, i) => s + itemCost(i, feira.cfg), 0));
  const grande = $derived(
    on.filter((i) => i.freq === 'mes').reduce((s, i) => s + itemCost(i, feira.cfg), 0),
  );
  const reposicao = $derived(total - grande);
  const sobra = $derived(feira.cfg.vale - total);

  function add() {
    feira.itens.unshift({
      id: nid(),
      name: 'Novo item',
      cat: 'Outros',
      freq: 'mes',
      qty: 1,
      unit: 'un',
      price: 0,
      cook: false,
      on: true,
      nota: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
  <div class="btnrow" style="margin-top:0">
    <button class="btn" onclick={add}>+ Adicionar item</button>
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

{#if !feira.itens.length}
  <div class="panel">
    <p class="small">
      Nenhum item ainda. Use <b>+ Adicionar item</b>, ou volte e cole uma nota fiscal / a lista da dieta.
    </p>
  </div>
{:else}
  {#each groups as [cat, list] (cat)}
    <div class="catlabel">{cat}</div>
    {#each list as item (item.id)}
      <ItemCard {item} remove={() => (feira.itens = feira.itens.filter((x) => x.id !== item.id))} />
    {/each}
  {/each}
{/if}

<div class="panel">
  <div class="btnrow" style="margin-top:0">
    <button class="btn primary" onclick={() => go(4)}>Gerar a lista →</button>
  </div>
</div>
