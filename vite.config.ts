
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process'.
  // We use type assertion to bypass the incorrect type definition for 'process' in some environments.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    resolve: {
    },
    server: {
      open: true,
      port: 3000,
    },
    preview: {
      port: 3000,
    }
  };
});
