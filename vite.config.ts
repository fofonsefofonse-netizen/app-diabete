import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'CarbTracker',
        short_name: 'CarbTracker',
        description: 'Votre assistant de santé et calculateur de glucides.',
        theme_color: '#10B981',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: [] // Pas d'icônes générées pour l'instant
      }
    })
  ],
})
