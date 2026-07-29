import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relativo: o dist/ funciona servido de qualquer subpasta.
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      // Sem includeAssets: o globPatterns abaixo já pega svg, png e webmanifest,
      // e os dois juntos deixavam entradas repetidas no precache.
      manifest: {
        name: 'Feira · lista de mercado do mês',
        short_name: 'Feira',
        description:
          'Monte a lista de mercado do mês a partir da sua dieta e das suas notas fiscais. Funciona offline, sem cadastro.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#3a7d54',
        background_color: '#edf1e7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Sem API e sem dado remoto: o shell inteiro vai pro cache.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
        // O próprio plugin já põe o manifest e os ícones dele no precache.
        globIgnores: ['icon-*.png', 'manifest.webmanifest'],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
});
