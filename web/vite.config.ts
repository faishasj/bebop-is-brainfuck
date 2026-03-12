import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // VITE_BASE_PATH is set in CI for GitHub Pages (e.g. /bebop-brainfuck/).
  // For Netlify or local dev, defaults to '/'.
  base: process.env.VITE_BASE_PATH || '/',
});
