<script lang="ts">
  import Prompt from '../Prompt.svelte';
  import { norm } from '../format';
  import { matchDic } from '../match';
  import { AVISO, CARDAPIO, DIETA } from '../prompts';
  import { allowed, itemFromDic, itemFromLine } from '../quantity';
  import { feira } from '../state.svelte';

  let { go }: { go: (i: number) => void } = $props();

  let text = $state('');
  let error = $state('');
  let result = $state<{ add: number; total: number; semPreco: string[]; outros: string[] } | null>(null);

  const placeholder =
    'Arroz branco\nOvo de galinha\nFilé de frango\nQueijo coalho\nIogurte natural\nBanana\nBrócolis\n...';

  function cross() {
    error = '';
    result = null;
    const lines = text
      .split(/\r?\n/)
      .map((s) => s.replace(/^[\s•\-○●✓*\d.)]+/, '').trim())
      .filter(Boolean);
    if (!lines.length) {
      error = 'Cole a lista da dieta, um item por linha.';
      return;
    }

    let add = 0;
    const outros: string[] = [];
    const has = (name: string) => feira.itens.some((x) => norm(x.name) === norm(name));

    for (const l of lines) {
      const e = matchDic(l);
      if (e) {
        if (allowed(e, feira.cfg) && !has(e.n)) {
          feira.itens.push(itemFromDic(e, feira.cfg, feira.base));
          add++;
        }
        continue;
      }
      outros.push(l);
      const nm = l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
      if (!has(nm)) {
        feira.itens.push(itemFromLine(nm, feira.base));
        add++;
      }
    }

    feira.cfg.started = 1;
    result = {
      add,
      total: feira.itens.length,
      semPreco: feira.itens.filter((i) => i.on && !i.price).map((i) => i.name),
      outros,
    };
  }
</script>

<h2>2 · a lista da dieta</h2>
<p class="small">
  Cole a lista de compras do seu plano alimentar, um item por linha. O app cruza com os preços já
  aprendidos e sugere as quantidades do mês.
</p>
<Prompt
  texto={DIETA}
  aviso={AVISO}
  chamada="Seu plano é um PDF cheio de gramatura e refeição? Peça pra uma LLM traduzir pro formato
  daqui — mande o PDF junto com este pedido, e cole a resposta na caixa."
/>
<Prompt
  texto={CARDAPIO}
  aviso={AVISO}
  chamada="Não tem plano de nutricionista, e sim um cardápio da semana ou umas receitas? Este pedido
  faz o mesmo caminho a partir deles."
/>
<textarea bind:value={text} {placeholder}></textarea>
<div class="btnrow">
  <button class="btn primary" onclick={cross}>Cruzar com os preços</button>
  <button class="btn ghost" onclick={() => go(3)}>Ir pros itens →</button>
</div>

{#if error}
  <div class="warnbox">{error}</div>
{/if}

{#if result}
  <div class="hintbox">
    <b>{result.add} itens adicionados</b> ({result.total} no total).
    {#if result.semPreco.length}
      <br />Ainda sem preço: {result.semPreco.slice(0, 12).join(', ')}{result.semPreco.length > 12 ? '…' : ''}
      — preencha no passo 3 ou cole uma nota fiscal.
    {/if}
    {#if result.outros.length}
      <br /><span style="color:var(--muted)">Entraram como “Outros”: {result.outros.slice(0, 8).join(', ')}</span>
    {/if}
  </div>
  <div class="btnrow">
    <button class="btn primary" onclick={() => go(3)}>Ajustar itens →</button>
  </div>
{/if}
