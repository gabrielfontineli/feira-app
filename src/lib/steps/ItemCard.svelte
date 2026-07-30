<script lang="ts">
  import { CATORDER } from '../dic';
  import { brl0 } from '../format';
  import { itemCost, LOSS_MAX, rawQty } from '../quantity';
  import { feira } from '../state.svelte';
  import type { Item } from '../types';

  let { item, remove }: { item: Item; remove: () => void } = $props();

  const cost = $derived(itemCost(item, feira.cfg));
  const raw = $derived(rawQty(item, feira.cfg));
</script>

<div class="ecard" class:off={!item.on}>
  <div class="top">
    <input type="checkbox" bind:checked={item.on} aria-label="incluir na lista" />
    <input type="text" bind:value={item.name} />
    <button class="del" onclick={remove} aria-label="apagar item">×</button>
  </div>
  <div class="mini">
    <div>
      <!-- Com `cook` ligado o campo é peso cozido: o rótulo tem que dizer,
           senão o mesmo número significa duas coisas (defeito 10). -->
      <label>
        {item.cook ? 'Qtd/mês cozido' : 'Qtd/mês'}
        <input type="number" step="any" min="0" bind:value={item.qty} />
      </label>
    </div>
    <div>
      <label>
        Unidade
        <input type="text" bind:value={item.unit} />
      </label>
    </div>
    <div>
      <label>
        Preço R$
        <input type="number" step="any" min="0" bind:value={item.price} />
      </label>
    </div>
    <div>
      <label>
        Frequência
        <select bind:value={item.freq}>
          <option value="mes">mês</option>
          <option value="quinzena">15 dias</option>
          <option value="semana">semana</option>
        </select>
      </label>
    </div>
    <div>
      <label>
        Categoria
        <select bind:value={item.cat}>
          {#each CATORDER as c (c)}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>
  {#if item.cook}
    <div class="mini" style="margin-top:8px">
      <div>
        <label>
          Perda ao cozinhar %
          <input
            type="number"
            step="any"
            min="0"
            max={LOSS_MAX}
            placeholder={String(feira.cfg.loss)}
            bind:value={item.loss}
          />
        </label>
      </div>
    </div>
  {/if}
  <div class="foot">
    <label class="chk" style="font-size:13px">
      <input type="checkbox" bind:checked={item.cook} /> Coz. (perde peso)
    </label>
    <span class="cost">
      {brl0(cost)}
      {#if item.cook}<span class="raw">· comprar {raw.toFixed(1)} {item.unit} cru</span>{/if}
    </span>
  </div>
  {#if item.nota}
    <div class="nota">{item.nota}</div>
  {/if}
</div>

<style>
  .ecard{background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px;margin-bottom:9px}
  .ecard.off{opacity:.5}
  .ecard .top{display:flex;gap:9px;align-items:center;margin-bottom:9px}
  .ecard .top input[type=text]{font-weight:600}
  .ecard .top input[type=checkbox]{width:20px;height:20px;accent-color:var(--green);flex:none}
  .ecard .mini{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(86px,1fr))}
  .ecard .mini label{display:block;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:3px}
  .ecard .mini input,.ecard .mini select{padding:8px;font-size:14px;margin-top:3px}
  .ecard .foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:9px;flex-wrap:wrap}
  .ecard .cost{font-family:'Space Mono',monospace;font-weight:700;color:var(--green-deep);font-size:15px}
  .ecard .cost .raw{font-size:11px;font-weight:400;color:var(--green)}
  .ecard .nota{font-size:11px;color:var(--green);font-family:'Space Mono',monospace;margin-top:5px}
  .del{border:none;background:none;color:#c4ccbe;cursor:pointer;font-size:21px;padding:0 6px;line-height:1;flex:none}
  .del:hover{color:var(--coral)}
</style>
