<script lang="ts">
  import { onMount } from 'svelte';
  import Steps from './lib/Steps.svelte';
  import Toast from './lib/Toast.svelte';
  import { feira } from './lib/state.svelte';
  import { toast } from './lib/toaster.svelte';
  import Backup from './lib/steps/Backup.svelte';
  import Diet from './lib/steps/Diet.svelte';
  import Editor from './lib/steps/Editor.svelte';
  import List from './lib/steps/List.svelte';
  import Receipt from './lib/steps/Receipt.svelte';
  import Start from './lib/steps/Start.svelte';

  let step = $state(0);
  let fileInput: HTMLInputElement;

  function go(i: number) {
    step = i;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(async () => {
    await feira.load();
    if (feira.cfg.started || feira.itens.length) go(4);
  });

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      await feira.restore(JSON.parse(await f.text()));
      go(4);
      toast.show(feira.itens.length + ' itens importados');
    } catch {
      alert('Não consegui ler esse arquivo. Ele precisa ser um backup .json exportado pelo próprio app.');
    }
    input.value = '';
  }
</script>

<div class="wrap">
  <div class="brand">
    <div class="logo">
      <svg viewBox="0 0 100 100">
        <path d="M28 34h44l-5 38H33z" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round" />
        <path d="M40 34a10 10 0 0120 0" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" />
      </svg>
    </div>
    <div>
      <h1>feira</h1>
      <div class="tagline">a lista do mês, a partir da sua dieta e das suas notas</div>
    </div>
  </div>

  <Steps {step} {go} />

  {#if step === 0}
    <section class="panel"><Start {go} pickFile={() => fileInput.click()} /></section>
  {:else if step === 1}
    <section class="panel"><Receipt {go} /></section>
  {:else if step === 2}
    <section class="panel"><Diet {go} /></section>
  {:else if step === 3}
    <Editor {go} />
  {:else if step === 4}
    <List />
  {:else}
    <section class="panel"><Backup pickFile={() => fileInput.click()} /></section>
  {/if}

  <input type="file" bind:this={fileInput} accept="application/json,.json" class="hide" onchange={onFile} />

  <footer>
    Feira · lista de mercado do mês. Seus dados nunca saem deste aparelho.<br />
    Salvando neste navegador.
  </footer>
</div>

<Toast />

<style>
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .logo{width:34px;height:34px;border-radius:10px;background:var(--green);display:grid;place-items:center;flex:none}
  .logo svg{width:19px;height:19px}
  .brand h1{font-family:'Fraunces',serif;font-weight:600;font-size:22px;margin:0;letter-spacing:-.01em;text-transform:lowercase}
  .brand .tagline{font-size:12px;color:var(--muted)}
</style>
