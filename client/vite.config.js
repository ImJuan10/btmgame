import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/prices': 'http://localhost:3000',
      '/holdings': 'http://localhost:3000',
      '/transactions': 'http://localhost:3000',
      '/deposit': 'http://localhost:3000',
      '/withdraw': 'http://localhost:3000',
      '/buy': 'http://localhost:3000',
      '/sell': 'http://localhost:3000',
      '/transfer-to-casino': 'http://localhost:3000',
      '/transfer-to-wallet': 'http://localhost:3000',
      '/casino': 'http://localhost:3000',
      '/market-hack': 'http://localhost:3000',
      '/exchange-rates': 'http://localhost:3000',
      '/balances': 'http://localhost:3000',
    },
  },
})
