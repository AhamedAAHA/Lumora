import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lumoraPublic = path.resolve(__dirname, '../backend/public');
const backendDir = path.resolve(__dirname, '../backend');
const APP_URL = 'http://localhost:5173';
const BACKEND_INTERNAL_PORT = process.env.BACKEND_INTERNAL_PORT || '5000';

let backendProcess = null;

/** Start Express API in background; only port 5173 is exposed to the browser */
function lumoraBackendPlugin() {
  return {
    name: 'lumora-backend',
    configureServer(server) {
      if (backendProcess) return;
      backendProcess = spawn(process.execPath, ['index.js'], {
        cwd: backendDir,
        env: {
          ...process.env,
          PORT: BACKEND_INTERNAL_PORT,
          SERVER_URL: APP_URL,
          CLIENT_URL: APP_URL,
        },
        stdio: 'inherit',
      });
      backendProcess.on('error', (err) => console.error('[lumora-backend]', err));

      const stopBackend = () => {
        if (backendProcess) {
          backendProcess.kill();
          backendProcess = null;
        }
      };
      server.httpServer?.on('close', stopBackend);
      process.on('SIGINT', stopBackend);
      process.on('SIGTERM', stopBackend);
    },
    closeBundle() {
      if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
      }
    },
  };
}

/** Serve PIN interview HTML/CSS/JS from backend/public */
function lumoraPublicPlugin() {
  return {
    name: 'lumora-public',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const serve =
          url.endsWith('.html') || url.startsWith('/css/') || url.startsWith('/js/');
        if (!serve) return next();

        const rel = url === '/' ? '/index.html' : url;
        const filePath = path.join(lumoraPublic, rel.replace(/^\//, ''));
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();

        const types = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
        };
        const ext = path.extname(filePath);
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

const proxyToBackend = {
  target: `http://127.0.0.1:${BACKEND_INTERNAL_PORT}`,
  changeOrigin: true,
};

export default defineConfig({
  plugins: [lumoraBackendPlugin(), react(), lumoraPublicPlugin()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': proxyToBackend,
      '/audio': proxyToBackend,
      '/uploads': proxyToBackend,
    },
  },
  preview: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': proxyToBackend,
      '/audio': proxyToBackend,
      '/uploads': proxyToBackend,
    },
  },
});
