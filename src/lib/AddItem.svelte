<script lang="ts">
  import { FREQ } from './dic';
  import { brl2 } from './format';
  import { itemFromDic, itemFromLine, sugQty } from './quantity';
  import { feira } from './state.svelte';
  import { sugerir, type Sugestao } from './suggest';
  import { toast } from './toaster.svelte';

  /**
   * No mercado o item pode ser de uma ida só, então são dois botões. No
   * planejamento você está montando o mês inteiro e só existe item fixo.
   */
  let { modo = 'planejamento' }: { modo?: 'mercado' | 'planejamento' } = $props();

  let q = $state('');
  let campo = $state<HTMLInputElement>();

  const sugestoes = $derived(sugerir(q, feira.itens));

  const q2 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  /** O que o dicionário vai preencher por você — vale mostrar antes do toque. */
  function resumo(s: Sugestao): string {
    const p = feira.base[s.name]?.price;
    return [
      s.entry?.c || 'Outros',
      q2(s.entry ? sugQty(s.entry, feira.cfg) : 1) + ' ' + (s.entry?.u || 'un'),
      FREQ[s.entry?.f || 'mes'].s,
      p ? 'R$ ' + brl2(p) : 'sem preço',
    ].join(' · ');
  }

  function criar(s: Sugestao, soHoje: boolean) {
    q = '';
    campo?.focus();
    if (s.existente) {
      s.existente.on = true;
      toast.show(s.name + ' já estava na lista');
      return;
    }
    feira.adicionar(
      s.entry ? itemFromDic(s.entry, feira.cfg, feira.base) : itemFromLine(s.name, feira.base),
      soHoje,
    );
    toast.show(s.name + (soHoje ? ' · só nesta ida' : ' adicionado'));
  }
</script>

<details class="add" open={modo === 'planejamento'}>
  <summary>+ adicionar item</summary>
  <input
    bind:this={campo}
    bind:value={q}
    type="text"
    enterkeyhint="done"
    placeholder="banana, detergente, papel higiênico…"
  />
  {#if q.trim()}
    <ul>
      {#each sugestoes as s (s.name)}
        <li>
          <div class="txt">
            <b>{s.name}</b>
            <span>{s.existente ? 'já está na lista' : resumo(s)}</span>
          </div>
          {#if s.existente}
            <button class="btn ghost" onclick={() => criar(s, false)}>ligar</button>
          {:else if modo === 'mercado'}
            <!-- Os dois botões vivem na linha da sugestão: adicionar continua
                 sendo um toque, mesmo perguntando se o item é fixo. -->
            <button class="btn" onclick={() => criar(s, true)}>hoje</button>
            <button class="btn primary" onclick={() => criar(s, false)}>mês</button>
          {:else}
            <button class="btn primary" onclick={() => criar(s, false)}>adicionar</button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</details>

<style>
  .add summary{font-size:13px;font-weight:600;color:var(--green-deep);cursor:pointer;
    padding:6px 0;list-style:none;user-select:none}
  .add summary::-webkit-details-marker{display:none}
  .add[open] summary{margin-bottom:7px}
  .add ul{list-style:none;margin:8px 0 0;padding:0}
  .add li{display:flex;align-items:center;gap:7px;padding:9px 0;border-top:1px solid var(--line)}
  .add .txt{flex:1;min-width:0}
  .add .txt b{display:block;font-size:14.5px;font-weight:600}
  .add .txt span{display:block;font-family:'Space Mono',monospace;font-size:11px;color:var(--muted)}
  .add .btn{flex:none;font-size:12.5px;padding:8px 12px}
</style>
