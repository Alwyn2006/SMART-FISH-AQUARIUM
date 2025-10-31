import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/esp': {
        target: 'http://10.240.190.83/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/esp/, ''),
      },
      '/camera': {
        target: 'http://10.240.190.161/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/camera/, ''),
      },
      '/cam81': {
        target: 'http://10.240.190.161:81/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/cam81/, ''),
      },
    },
  },
})
