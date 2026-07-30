/**
 * Copia texto, com o caminho antigo como reserva: em iOS servido por http e em
 * WebView sem permissão, `navigator.clipboard` existe mas rejeita. Devolve
 * false quando nem a reserva funcionou, pra quem chamou decidir o que mostrar.
 */
export async function copyText(txt: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}
