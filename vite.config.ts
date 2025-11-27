import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Mudança crítica: './' garante caminhos relativos para assets (como o logo.png)
  base: './',
})