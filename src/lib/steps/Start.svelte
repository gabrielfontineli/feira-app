<script lang="ts">
  import { EX_BASE, exampleItems } from '../example';
  import { feira } from '../state.svelte';
  import { toast } from '../toaster.svelte';

  let { go, pickFile }: { go: (i: number) => void; pickFile: () => void } = $props();

  /* Os ajustes só aparecem depois de escolher um ponto de partida — é o que o
     app antigo fazia com showCfg(), sem precisar de estado extra. */
  const configuring = $derived(feira.cfg.started === 1 || feira.itens.length > 0);

  function fromScratch() {
    feira.itens = [];
    feira.base = {};
    feira.cfg.started = 1;
    toast.show('Pronto — agora é só configurar');
  }

  function fromExample() {
    feira.base = structuredClone(EX_BASE);
    feira.itens = exampleItems();
    feira.cfg.started = 1;
    /* Sem chutar orçamento: o valor antigo era pessoal de uma casa só.
       vale=0 significa "não informado" e o resumo simplesmente não compara. */
    toast.show(feira.itens.length + ' itens carregados');
  }
</script>

{#if !configuring}
  <h2>como você quer começar?</h2>
  <p class="small">Nada é enviado pra internet: tudo fica guardado neste aparelho.</p>
  <div class="choice">
    <button onclick={fromScratch}>
      <span class="ic">✏️</span>
      <span>
        <span class="t">Começar do zero</span>
        <span class="d">Você adiciona os itens na mão, ou colando uma nota fiscal e a lista da sua dieta.</span>
      </span>
    </button>
    <button onclick={fromExample}>
      <span class="ic">🥗</span>
      <span>
        <span class="t">Usar exemplo pronto</span>
        <span class="d">Casal com dieta prescrita: ~70 itens com preços reais de mercado (Natal/RN, 2026). Depois é só ajustar.</span>
      </span>
    </button>
    <button onclick={pickFile}>
      <span class="ic">📂</span>
      <span>
        <span class="t">Importar backup</span>
        <span class="d">Tem um <b>.json</b> ou um <b>.md</b> exportado antes? Carregue aqui.</span>
      </span>
    </button>
  </div>
{:else}
  <h2>ajustes</h2>
  <p class="small">Isso afeta as quantidades sugeridas e a comparação com o seu orçamento.</p>
  <div class="grid">
    <div>
      <label class="f" for="qPessoas">Pessoas em casa</label>
      <input type="number" id="qPessoas" min="1" step="1" bind:value={feira.cfg.pessoas} />
    </div>
    <div>
      <label class="f" for="qDias">Dias no mês</label>
      <input type="number" id="qDias" min="1" max="31" step="1" bind:value={feira.cfg.dias} />
    </div>
    <div>
      <label class="f" for="qLoss">Perda ao cozinhar carnes (%)</label>
      <input type="number" id="qLoss" min="0" max="90" step="1" bind:value={feira.cfg.loss} />
    </div>
    <div>
      <label class="f" for="qVale">Orçamento do mês (R$)</label>
      <input type="number" id="qVale" min="0" step="0.01" bind:value={feira.cfg.vale} />
    </div>
  </div>
  <h3>incluir na lista</h3>
  <div class="grid">
    <label class="chk">
      <input type="checkbox" checked={!!feira.cfg.limpeza} onchange={(e) => (feira.cfg.limpeza = e.currentTarget.checked ? 1 : 0)} /> Limpeza
    </label>
    <label class="chk">
      <input type="checkbox" checked={!!feira.cfg.higiene} onchange={(e) => (feira.cfg.higiene = e.currentTarget.checked ? 1 : 0)} /> Higiene
    </label>
    <label class="chk">
      <input type="checkbox" checked={!!feira.cfg.extras} onchange={(e) => (feira.cfg.extras = e.currentTarget.checked ? 1 : 0)} /> Extras (doces, bebidas)
    </label>
  </div>
  <div class="btnrow">
    <button class="btn primary" onclick={() => go(2)}>Continuar →</button>
    <button class="btn ghost" onclick={() => go(4)}>Ir pra lista</button>
  </div>
{/if}

<style>
  .choice{display:grid;gap:10px;margin-top:14px}
  .choice button{display:flex;gap:12px;align-items:flex-start;text-align:left;background:#fff;border:1px solid var(--line);
    border-radius:14px;padding:15px;cursor:pointer;font-family:inherit;width:100%}
  .choice button:hover{border-color:var(--green)}
  .choice .ic{font-size:22px;line-height:1;flex:none}
  .choice .t{font-weight:600;font-size:15px;color:var(--ink)}
  .choice .d{font-size:12.5px;color:var(--muted);margin-top:2px}
</style>
