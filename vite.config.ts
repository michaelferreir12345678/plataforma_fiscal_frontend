/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    // Máquina de dev com pouca RAM: arquivos em paralelo disputavam CPU e as esperas
    // do RTL estouravam por contenção, não por defeito. Serial + folga no timeout.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
