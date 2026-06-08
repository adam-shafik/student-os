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
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-96x96.png', 'icons/apple-touch-icon.png'],
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
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
          share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              files: [{ name: 'pdf', accept: ['application/pdf'] }],
            },
          },
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        },
      })]),
    ],
  }
})
