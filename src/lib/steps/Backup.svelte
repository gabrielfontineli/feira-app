<script lang="ts">
  import { feira } from '../state.svelte';
  import { toast } from '../toaster.svelte';

  let { pickFile, go }: { pickFile: () => void; go: (i: number) => void } = $props();

  async function exportar() {
    const dump = await feira.backup();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download =
      'feira-backup-' + feira.ym.y + '-' + String(feira.ym.m + 1).padStart(2, '0') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast.show('Backup exportado');
  }

  async function nuke() {
    if (!confirm('Apagar TODOS os dados deste aparelho? Não tem como desfazer.')) return;
    await feira.nuke();
    toast.show('Tudo apagado');
  }
</script>

<h2>backup e privacidade</h2>
<p class="small">
  Os dados ficam apenas neste navegador/aparelho — ninguém mais tem acesso, e nada vai pra nenhum
  servidor. A contrapartida: pra usar em outro celular, exporte aqui e importe lá.
</p>
<div class="btnrow" style="margin-top:0">
  <button class="btn primary" onclick={exportar}>Exportar backup (.json)</button>
  <button class="btn" onclick={pickFile}>Importar backup</button>
</div>

<h3>preços em lote</h3>
<p class="small">
  O jeito normal de ensinar um preço é digitar na hora de riscar o item da lista. Se você tiver o
  texto de uma nota fiscal inteira em mãos, dá pra importar tudo de uma vez.
</p>
<div class="btnrow" style="margin-top:0">
  <button class="btn" onclick={() => go(1)}>Colar uma nota fiscal</button>
</div>

<h3>instalar como app</h3>
<p class="small">
  <b>iPhone:</b> Safari → botão de compartilhar → “Adicionar à Tela de Início”.<br />
  <b>Android:</b> Chrome → menu ⋮ → “Adicionar à tela inicial”.<br />Depois abre em tela cheia, com
  ícone, e funciona sem internet.
</p>

<h3>zona de risco</h3>
<div class="btnrow" style="margin-top:0">
  <button class="btn danger" onclick={nuke}>Apagar tudo e recomeçar</button>
</div>
