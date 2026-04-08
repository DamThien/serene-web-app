import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist' },
  server: {
    proxy: {
      // Proxy /audio/* → real CDN, strips CORS restriction
      '/audio': {
        target: 'https://kiara-api.shapeecloud.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/audio/, '/v1/sounds/mylodies_all_sound'),
        configure: (proxy) => {
          // Force browser to see the response as same-origin
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['cross-origin-resource-policy'] = 'cross-origin';
            // Allow range requests (needed for audio seeking)
            if (proxyRes.headers['accept-ranges']) {
              proxyRes.headers['accept-ranges'] = 'bytes';
            }
          });
        },
      },
    },
  },
})
