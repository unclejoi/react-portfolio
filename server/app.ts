import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chatRequestSchema, type ChatRequest, type ChatResponse } from './grounding.js';

export type AnswerQuestion = (request: ChatRequest, signal: AbortSignal) => Promise<ChatResponse>;

export function createApp(options: { answer?: AnswerQuestion; trustProxyHops?: number; production?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxyHops ?? 0);
  app.use(helmet({
    // Allow the portfolio's existing Google fonts; external scripts remain disallowed.
    contentSecurityPolicy: { directives: {
      'style-src': ["'self'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'upgrade-insecure-requests': options.production ? [] : null,
    } },
  }));
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', chat: options.answer ? 'configured' : 'not_configured' });
  });
  app.use('/api/chat', rateLimit({
    windowMs: 10 * 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', error: 'Too many questions. Please try again in a few minutes.' },
  }));
  app.use(express.json({ limit: '16kb' }));
  let activeRequests = 0;
  app.post('/api/chat', async (request, response) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ code: 'INVALID_REQUEST', error: 'Send a question of 1–1500 characters and at most 6 recent chat messages.' });
      return;
    }
    if (!options.answer) {
      response.status(503).json({ code: 'NOT_CONFIGURED', error: 'The resume assistant is not configured yet. You can read the resume or contact Joi directly.' });
      return;
    }
    if (activeRequests >= 4) {
      response.status(503).json({ code: 'BUSY', error: 'The resume assistant is busy. Please try again shortly.' });
      return;
    }
    activeRequests++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    const cancel = () => controller.abort();
    response.on('close', cancel);
    try {
      const result = await options.answer(parsed.data, controller.signal);
      if (!response.destroyed) response.json(result);
    } catch {
      // Never substitute generated/uncited text when a provider fails, or expose provider errors or keys.
      if (!response.destroyed) response.status(503).json({ code: 'ASSISTANT_UNAVAILABLE', error: 'The resume assistant is temporarily unavailable. Please try again or read the resume.' });
    } finally {
      clearTimeout(timeout);
      response.off('close', cancel);
      activeRequests--;
    }
  });
  app.use('/api', (_request, response) => {
    response.status(404).json({ code: 'NOT_FOUND', error: 'API route not found.' });
  });
  const dist = resolve(process.cwd(), 'dist');
  if (options.production && existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (_request, response) => response.sendFile(resolve(dist, 'index.html')));
  } else if (!options.production) {
    app.get('/', (_request, response) => response.redirect('http://127.0.0.1:4173/'));
  }
  const errors: ErrorRequestHandler = (error: { type?: string }, _request, response, _next) => {
    const tooLarge = error.type === 'entity.too.large';
    response.status(tooLarge ? 413 : 400).json({ code: 'INVALID_BODY', error: tooLarge ? 'That message is too large. Please shorten it.' : 'Send a valid JSON request.' });
  };
  app.use(errors);
  return app;
}
