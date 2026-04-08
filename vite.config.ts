import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev
export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  const base = isProd ? '/serene-web-app/' : '/';

  return {
    base: base,
    plugins: [react(), tailwindcss()],
    // Thêm dòng này để dùng ở bất cứ đâu trong code
    define: {
      'process.env.ASSETS_URL': JSON.stringify(base)
    },
    build: { outDir: 'dist' },

    server: {
      proxy: {
        '/audio': {
          target: 'https://serene-api.shapeecloud.com/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/audio/, '/v1/sounds/mylodies_all_sound'),
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['access-control-allow-origin'] = '*';
              proxyRes.headers['cross-origin-resource-policy'] = 'cross-origin';
              if (proxyRes.headers['accept-ranges']) {
                proxyRes.headers['accept-ranges'] = 'bytes';
              }
            });
          },
        },
      },
    },
  }
})
