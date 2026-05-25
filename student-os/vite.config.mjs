import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'

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
      }])] : []),
    ],
  }
})
