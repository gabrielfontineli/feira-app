<script lang="ts">
  const STEPNAMES = ['início', 'nota fiscal', 'dieta', 'itens', 'lista', 'backup'];

  let { step, go }: { step: number; go: (i: number) => void } = $props();
</script>

<nav class="steps">
  {#each STEPNAMES as name, i (name)}
    <button class="stepbtn" class:on={i === step} onclick={() => go(i)}>
      {#if i < 5}<span class="n">{i + 1}</span>{/if}{name}
    </button>
  {/each}
</nav>

<style>
  .steps{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:14px;scrollbar-width:none}
  .steps::-webkit-scrollbar{display:none}
  .stepbtn{flex:none;font-family:inherit;font-size:12.5px;font-weight:600;border-radius:999px;padding:8px 13px;
    border:1px solid var(--line);background:var(--card);color:var(--muted);cursor:pointer;white-space:nowrap}
  .stepbtn.on{background:var(--green);border-color:var(--green);color:#fff}
  .stepbtn .n{font-family:'Space Mono',monospace;opacity:.7;margin-right:5px}
</style>
