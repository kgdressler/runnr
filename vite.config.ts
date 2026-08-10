/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Deployed to https://kgdressler.github.io/runnr/, so assets need the repo
// name as a base path. Dev server stays at the root.
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/runnr/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
