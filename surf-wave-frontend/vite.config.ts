import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,  // 외부 기기 접속 허용 (같은 Wi-Fi 내 핸드폰 등)
    allowedHosts: ['hawthorny-unslayable-spring.ngrok-free.dev'],  // ngrok 터널 호스트 허용
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      /** 업로드된 이미지 로컬 서빙 — 백엔드 정적 파일 프록시 */
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  /** 프로덕션 빌드 보안 설정 */
  build: {
    /** 소스맵 비활성화 - 프로덕션에서 소스 코드 노출 방지 */
    sourcemap: false,
    /** 청크 크기 경고 임계값 */
    chunkSizeWarningLimit: 1000,
  },
})
