import type { Cfg } from './types';

/*
 * Os ajustes e a conferência deles. Moraram no state.svelte.ts até o Markdown
 * precisar de um cfg padrão: aquele arquivo tem runas, e o vitest roda sem o
 * plugin do Svelte, então importá-lo de um módulo puro quebrava o teste. Isto
 * aqui é dado e validação, sem DOM e sem estado — o lugar dele é um .ts comum.
 */

export const DEFAULT_CFG: Cfg = {
  pessoas: 2,
  dias: 30,
  loss: 25,
  vale: 0,
  limpeza: 1,
  higiene: 1,
  extras: 0,
  started: 0,
};

const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Confere os ajustes que vêm de fora (backup, storage antigo). Antes o app
 * fazia Object.assign às cegas, e um `pessoas` inválido espalhava NaN por
 * todas as quantidades sugeridas.
 */
export function toCfg(raw: unknown): Cfg {
  const r = (raw ?? {}) as Partial<Record<keyof Cfg, unknown>>;
  return {
    pessoas: Math.max(1, num(r.pessoas, DEFAULT_CFG.pessoas)),
    dias: Math.min(31, Math.max(1, num(r.dias, DEFAULT_CFG.dias))),
    loss: Math.min(90, Math.max(0, num(r.loss, DEFAULT_CFG.loss))),
    vale: Math.max(0, num(r.vale, DEFAULT_CFG.vale)),
    limpeza: r.limpeza ? 1 : 0,
    higiene: r.higiene ? 1 : 0,
    extras: r.extras ? 1 : 0,
    started: r.started ? 1 : 0,
  };
}
