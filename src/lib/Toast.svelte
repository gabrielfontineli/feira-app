<script lang="ts">
  import { toast } from './toaster.svelte';
</script>

<div class="toast" class:on={!!toast.msg} role="status" aria-live="polite">
  {toast.msg}
  {#if toast.action}
    <button
      onclick={() => {
        const a = toast.action;
        toast.hide();
        a?.run();
      }}>{toast.action.label}</button
    >
  {/if}
</div>

<style>
  .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom));
    background:var(--ink);color:#f2f4ec;padding:11px 18px;border-radius:999px;font-size:13.5px;font-weight:500;
    z-index:99;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;
    display:flex;align-items:center;gap:12px}
  .toast.on{opacity:1;transform:translateX(-50%) translateY(-4px);pointer-events:auto}
  .toast button{font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;
    background:none;border:none;color:#8fd8ab;padding:0}
</style>
