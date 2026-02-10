import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      '/api/nhl': {
        target: 'https://api-web.nhle.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nhl/, '/v1'),
        secure: false
      }
    }
  }
})
