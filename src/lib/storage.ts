/* =====================================================================
   Armazenamento local. Sem servidor, sem conta: tudo fica neste aparelho.
   Fallback em memória pra navegação privada, onde localStorage lança.
   As chaves mantêm o prefixo 'feira:' de sempre, então dados antigos
   continuam sendo lidos.
   ===================================================================== */
const PFX = 'feira:';
const MemFallback: Record<string, unknown> = {};

export function localGet<T>(k: string): T | null {
  try {
    const v = window.localStorage.getItem(PFX + k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return (MemFallback[k] as T) ?? null;
  }
}

export function localSet(k: string, v: unknown): void {
  try {
    window.localStorage.setItem(PFX + k, JSON.stringify(v));
  } catch {
    MemFallback[k] = v;
  }
}

export function localDel(k: string): void {
  try {
    window.localStorage.removeItem(PFX + k);
  } catch {
    delete MemFallback[k];
  }
}

/* As três funções abaixo existem só pra manter a assinatura assíncrona que o
   resto do app já usava. Trocar por sync obrigaria a mexer em toda chamada. */
export async function dget<T>(k: string): Promise<T | null> {
  return localGet<T>(k);
}

export async function dset(k: string, v: unknown): Promise<void> {
  localSet(k, v);
}

export async function ddel(k: string): Promise<void> {
  localDel(k);
}

/** Toda chave de marcação já guardada, pra backup não perder histórico. */
export function allCheckKeys(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PFX + 'check:')) out.push(k.slice(PFX.length));
    }
    return out.sort();
  } catch {
    return Object.keys(MemFallback).filter((k) => k.startsWith('check:')).sort();
  }
}
