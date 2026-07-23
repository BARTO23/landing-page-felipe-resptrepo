import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://abogadojuanfeliperestreposanchez.com',
  integrations: [
    tailwind(),
    sitemap()
  ],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    server: {
      // Permite exponer el dev server a través de túneles (ngrok) para
      // probar el webhook de ePayco. No afecta al build de producción.
      allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok-free.app']
    }
  }
});