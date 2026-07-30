import { defineConfig } from 'vitest/config';

/* Config próprio, sem os plugins do vite.config.ts: os testes só tocam a lógica
   pura de src/lib/*.ts, então svelte e PWA não precisam ser carregados. */
export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts'],
    environment: 'node',
  },
});
