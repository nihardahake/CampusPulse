import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { port: 5173 }, build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'], router: ['react-router-dom'], http: ['axios'] } } } } });
