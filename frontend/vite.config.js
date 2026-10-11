import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Tailwind CSS v4 is wired in through its official Vite plugin (no postcss/tailwind.config.js needed).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
