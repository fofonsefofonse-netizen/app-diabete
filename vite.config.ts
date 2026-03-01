import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'CarbTracker',
        short_name: 'CarbTracker',
        description: 'Votre assistant de santé et calculateur de glucides.',
        theme_color: '#10B981',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
