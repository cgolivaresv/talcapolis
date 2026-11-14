import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Instalable como app (escritorio y móvil) y utilizable sin conexión una vez cargada.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Talcapolis',
        short_name: 'Talcapolis',
        description: 'Juego de mesa de compra y venta sobre el centro de Talca, Chile.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#222629',
        background_color: '#144e3a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'] },
    }),
  ],
})
