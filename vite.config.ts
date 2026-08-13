import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/azure-api': {
          target: 'https://dev.azure.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/azure-api/, ''),
          secure: false,
          headers: {
            'Origin': 'https://dev.azure.com'
          }
        },
        '/deepseek-api': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/deepseek-api/, ''),
          secure: false
        },
        '/gemini-api': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gemini-api/, ''),
          secure: false
        }
      }
    },
    plugins: [
      react(),
      {
        name: 'local-git-diff-plugin',
        configureServer(server) {
          server.middlewares.use('/api/local-diff', (req, res) => {
            exec('git diff HEAD', (err, stdout, stderr) => {
              res.setHeader('Content-Type', 'application/json');
              if (err) {
                res.end(JSON.stringify({ error: stderr || err.message }));
              } else {
                res.end(JSON.stringify({ diff: stdout }));
              }
            });
          });
        }
      }
    ],
    define: {
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
