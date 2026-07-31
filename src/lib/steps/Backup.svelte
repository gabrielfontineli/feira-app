<script lang="ts">
  import Prompt from '../Prompt.svelte';
  import { AVISO, LISTA_MD } from '../prompts';
  import { feira } from '../state.svelte';
  import { toast } from '../toaster.svelte';

  let { pickFile, go }: { pickFile: () => void; go: (i: number) => void } = $props();

  function baixar(nome: string, tipo: string, conteudo: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  const sufixo = () => feira.ym.y + '-' + String(feira.ym.m + 1).padStart(2, '0');

  async function exportar() {
    const dump = await feira.backup();
    baixar('feira-backup-' + sufixo() + '.json', 'application/json', JSON.stringify(dump, null, 2));
    toast.show('Backup exportado');
  }

  function exportarMd() {
    baixar('feira-' + sufixo() + '.md', 'text/markdown', feira.toMd('tudo'));
    toast.show('Markdown exportado');
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
  <button class="btn" onclick={pickFile}>Importar (.json ou .md)</button>
</div>

<h3>markdown</h3>
<p class="small">
  O mesmo conteúdo num arquivo que dá pra ler e editar em qualquer lugar — Obsidian, Notas, um
  editor de texto. Mexer nele e importar de volta funciona: arquivo com a seção <b>ajustes</b>
  substitui a sua lista; arquivo só de itens soma à que já existe, pulando nome repetido.
</p>
<p class="small">
  Não substitui o <b>.json</b>: o Markdown leva o mês aberto, e deixa de fora o histórico dos meses
  passados e o desfazer dos preços digitados.
</p>
<div class="btnrow" style="margin-top:0">
  <button class="btn" onclick={exportarMd}>Exportar como .md</button>
</div>
<Prompt
  texto={LISTA_MD}
  aviso={AVISO}
  chamada="Quer montar uma lista do zero conversando com uma LLM? Este pedido faz ela responder já
  neste formato — salve como .md e importe aqui em cima."
/>

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
