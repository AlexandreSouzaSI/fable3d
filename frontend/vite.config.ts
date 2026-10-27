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
    // Atrás do Nginx o Host chega como o domínio público; sem liberar aqui,
    // o "vite preview" recusa a requisição (mesmo ajuste do Controle Rota).
    allowedHosts: ['localhost', 'fable.amsx.online', 'api.fable.amsx.online'],
  },
})
