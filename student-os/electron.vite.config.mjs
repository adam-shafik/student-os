import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'electron/main.mjs',
        formats: ['cjs'],
      },
      outDir: 'dist-electron',
      rollupOptions: {
        output: {
          entryFileNames: 'main.cjs',
        },
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: 'index.html',
      },
    },
    plugins: [tailwindcss(), react()],
  },
})
