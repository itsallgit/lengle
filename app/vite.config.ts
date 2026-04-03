import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // CRITICAL: must be '/' for correct asset paths when served from S3 root
})
