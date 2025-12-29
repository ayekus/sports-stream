import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/nhl': {
        target: 'https://api-web.nhle.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nhl/, ''),
        secure: false,
        followRedirects: true
      }
    }
  }
})
