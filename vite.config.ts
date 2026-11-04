/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@convex': path.resolve(import.meta.dirname, 'convex'),
    },
  },
  test: {
    include: ['shared/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
