import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Removido base: './' para garantir que os caminhos absolutos (/images/...) funcionem corretamente na raiz do domínio
})