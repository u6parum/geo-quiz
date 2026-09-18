import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const __dirname = import.meta.dirname;

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, '../../packages/shared/src'),
        '@pages': resolve(__dirname, './src/pages'),
        '@widgets': resolve(__dirname, './src/widgets'),
        '@features': resolve(__dirname, './src/features'),
        '@ui': resolve(__dirname, './src/shared/ui'),
        '@api': resolve(__dirname, './src/shared/api'),
        '@utils': resolve(__dirname, './src/shared/utils'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Auth-service
        '/api/auth': { target: env.VITE_AUTH_API_URL || 'http://localhost:3001', changeOrigin: true },
        '/api/users': { target: env.VITE_AUTH_API_URL || 'http://localhost:3001', changeOrigin: true },
        // Game-service (команды и игры теперь здесь)
        '/api/teams': { target: env.VITE_GAME_API_URL || 'http://localhost:3002', changeOrigin: true },
        '/api/games': { target: env.VITE_GAME_API_URL || 'http://localhost:3002', changeOrigin: true },
        '/api/applications': { target: env.VITE_GAME_API_URL || 'http://localhost:3002', changeOrigin: true },
        // WebSocket
        '/api/ws': {
          target: env.VITE_GAME_API_URL || 'ws://localhost:3002',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
