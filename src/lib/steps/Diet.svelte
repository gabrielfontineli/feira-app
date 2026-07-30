<script lang="ts">
  import { copyText } from '../clipboard';
  import { norm } from '../format';
  import { matchDic } from '../match';
  import { allowed, itemFromDic, itemFromLine } from '../quantity';
  import { feira } from '../state.svelte';
  import { toast } from '../toaster.svelte';

  let { go }: { go: (i: number) => void } = $props();

  let text = $state('');
  let error = $state('');
  let ajuda = $state(false);
  let result = $state<{ add: number; total: number; semPreco: string[]; outros: string[] } | null>(null);

  const placeholder =
    'Arroz branco\nOvo de galinha\nFilé de frango\nQueijo coalho\nIogurte natural\nBanana\nBrócolis\n...';

  /*
   * Plano de nutricionista vem em PDF, dividido por refeição, com quantidade em
   * grama e várias alternativas por prato. O que este passo aceita é uma coisa
   * bem mais simples: um ingrediente por linha. Traduzir de um pro outro na mão
   * é chato, então aqui vai o pedido pronto pra jogar numa LLM junto com o PDF.
   *
   * O que o texto exige é o que o app precisa: nome genérico de supermercado
   * (é o que `DIC` reconhece), sem quantidade (quem calcula a do mês é o
   * `sugQty`, a partir de pessoas e dias), e sem repetição.
   */
  const PROMPT = `Anexei o meu plano alimentar. Monte a lista de compras dele.

Formato da resposta:
- um ingrediente por linha, e nada mais: sem título, sem introdução, sem
  comentário no fim, sem marcador, sem numeração;
- sem quantidade e sem unidade — só o nome do ingrediente;
- nome genérico de supermercado, em português do Brasil: "frango grelhado" vira
  "filé de frango", "2 fatias de pão integral" vira "pão de forma integral",
  "Whey Growth 900g" vira "whey protein";
- cada ingrediente aparece uma vez só, mesmo que esteja em várias refeições ou
  em vários dias;
- quando o plano oferece alternativa ("ou"), todas as opções entram;
- inclua o que se compra no mercado e é usado no preparo: azeite, tempero, café,
  açúcar ou adoçante;
- deixe de fora o que não se compra na feira: água, suplemento manipulado,
  horário de refeição, orientação e observação do nutricionista.

Responda só com a lista.`;

  async function copiarPrompt() {
    if (await copyText(PROMPT)) toast.show('Prompt copiado');
    else ajuda = true;
  }

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
<div class="hintbox">
  Seu plano é um PDF cheio de gramatura e refeição? Peça pra uma LLM traduzir pro
  formato daqui — mande o PDF junto com este pedido, e cole a resposta na caixa.
  <div class="btnrow" style="margin:9px 0 0">
    <button class="btn" onclick={copiarPrompt}>Copiar o pedido</button>
    <button class="btn ghost" onclick={() => (ajuda = !ajuda)}>
      {ajuda ? 'Esconder' : 'Ver o pedido'}
    </button>
  </div>
  {#if ajuda}
    <pre class="prompt">{PROMPT}</pre>
    <p class="small" style="margin:6px 0 0">
      O plano alimentar não sai do seu aparelho por causa do app — mas mandar o PDF
      pra uma LLM manda o dado pra ela. É uma escolha sua, feita fora daqui.
    </p>
  {/if}
</div>
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

<style>
  .prompt{white-space:pre-wrap;font-family:'Space Mono',monospace;font-size:11.5px;line-height:1.55;
    background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px;margin:9px 0 0;
    max-height:280px;overflow:auto;user-select:all}
</style>
