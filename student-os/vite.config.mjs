import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => {
  const isElectron = !!process.env.VITE_ELECTRON
  return {
    base: command === 'build' ? './' : '/',
    plugins: [
      tailwindcss(),
      react(),
      ...(isElectron ? [electron([{
        entry: 'electron/main.mjs',
        vite: {
          build: {
            rollupOptions: { output: { format: 'cjs' } },
          },
        },
      }])] : [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'StudentOS',
          short_name: 'StudentOS',
          description: 'Student productivity app',
          theme_color: '#0b0c13',
          background_color: '#0b0c13',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/iygxmdezkwsjnvrtgpqv\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: { cacheName: 'supabase-api', networkTimeoutSeconds: 10 },
            },
          ],
        },
      })]),
    ],
  }
})
