import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const page = p => fileURLToPath(new URL(p, import.meta.url))

// Trên GitHub Pages, web nằm ở /<tên-repo>/ nên đặt BASE_PATH khi đóng gói (xem .github/workflows/deploy.yml).
// Ba trang: app ở trang chủ, trang giới thiệu ở /gioi-thieu/, trang găng tay ở /san-pham/.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    target: 'es2022',
    rollupOptions: { input: { app: page('index.html'), intro: page('gioi-thieu/index.html'), shop: page('san-pham/index.html') } },
  },
})
