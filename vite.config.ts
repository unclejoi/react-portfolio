import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  const configuredApiUrl = environment.VITE_API_URL?.trim();

  if (command === 'build' && !configuredApiUrl) {
    throw new Error('Set VITE_API_URL to your Render backend origin (for example, https://portfolio-api.onrender.com) before building. Add it to Vercel environment variables and redeploy.');
  }

  const apiUrl = configuredApiUrl || 'http://127.0.0.1:3001';
  let apiOrigin: string;

  try {
    const parsed = new URL(apiUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)
      || parsed.username || parsed.password
      || parsed.pathname.replace(/\/+$/, '') || parsed.search || parsed.hash) {
      throw new Error('Expected an HTTP(S) origin.');
    }
    apiOrigin = parsed.origin;
  } catch {
    throw new Error('VITE_API_URL must be an HTTP(S) backend origin, such as https://portfolio-api.onrender.com, without an /api path, query, or credentials.');
  }

  return {
    plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiOrigin) },
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
      watch: { ignored: ['**/artifacts/**', '**/.sites-runtime/**'] },
    },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  };
});
