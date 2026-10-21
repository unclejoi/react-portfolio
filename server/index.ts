import { createApp } from './app.js';
import { isConfigured, loadConfig } from './config.js';
import { createResumeAssistant } from './rag.js';

const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const config = loadConfig({ production });
const configured = isConfigured(config);
const answer = configured ? createResumeAssistant(config) : undefined;
const app = createApp({ answer, trustProxyHops: config.TRUST_PROXY_HOPS, production });
const server = app.listen(config.PORT, config.HOST);
server.on('listening', () => {
  console.log(`Portfolio website: ${production ? `http://${config.HOST}:${config.PORT}` : 'http://127.0.0.1:4173'}`);
  console.log(`Portfolio API: http://${config.HOST}:${config.PORT}/api`);
  if (!configured) console.log('Chat needs GEMINI_API_KEY and PINECONE_API_KEY in .env and an existing populated Pinecone index.');
});
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Cannot start: ${config.HOST}:${config.PORT} is already in use. Stop the running portfolio server (including npm run dev) before running npm start, or choose another PORT in .env.`);
  } else {
    console.error('The portfolio server could not start. Check HOST and PORT in .env.');
  }
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
