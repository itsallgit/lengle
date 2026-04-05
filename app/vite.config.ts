import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig({
  plugins: [react()],
  base: '/', // CRITICAL: must be '/' for correct asset paths when served from S3 root
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
