<script lang="ts">
  import { copyText } from './clipboard';
  import { toast } from './toaster.svelte';

  /*
   * Pedido pronto pra jogar numa LLM. Nasceu dentro do passo da dieta, onde
   * provou que resolve o pedaço mais chato do fluxo: traduzir um PDF de
   * nutricionista pro formato que o app lê. Virou componente porque o mesmo
   * truque serve pra nota fiscal e pro cardápio da semana.
   */
  let {
    texto,
    chamada,
    aviso = '',
  }: {
    /** O prompt em si. */
    texto: string;
    /** A frase que explica pra que serve, acima dos botões. */
    chamada: string;
    /** Privacidade: o que sai do aparelho se a pessoa mandar isso pra uma LLM. */
    aviso?: string;
  } = $props();

  let aberto = $state(false);

  async function copiar() {
    if (await copyText(texto)) toast.show('Prompt copiado');
    else aberto = true;
  }
</script>

<div class="hintbox">
  {chamada}
  <div class="btnrow" style="margin:9px 0 0">
    <button class="btn" onclick={copiar}>Copiar o pedido</button>
    <button class="btn ghost" onclick={() => (aberto = !aberto)}>
      {aberto ? 'Esconder' : 'Ver o pedido'}
    </button>
  </div>
  {#if aberto}
    <pre class="prompt">{texto}</pre>
    {#if aviso}
      <p class="small" style="margin:6px 0 0">{aviso}</p>
    {/if}
  {/if}
</div>

<style>
  .prompt{white-space:pre-wrap;font-family:'Space Mono',monospace;font-size:11.5px;line-height:1.55;
    background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px;margin:9px 0 0;
    max-height:280px;overflow:auto;user-select:all}
</style>
