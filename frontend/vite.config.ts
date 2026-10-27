import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
    // Atrás do Nginx o Host chega como o domínio público — adicione aqui
    // o domínio final quando for pra produção (ex: 'fable.amsx.online').
    allowedHosts: ['localhost'],
  },
})
