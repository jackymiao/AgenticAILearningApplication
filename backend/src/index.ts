// Polyfill for structuredClone if not available
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function structuredClone(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill for fetch if not available (for OpenAI SDK)
import fetch, { Headers, Request as FetchRequest, Response as FetchResponse, FormData } from 'node-fetch';
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = fetch as any;
  globalThis.Headers = Headers as any;
  globalThis.Request = FetchRequest as any;
  globalThis.Response = FetchResponse as any;
}
if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = FormData as any;
}

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import pool from './db/index.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import gameRoutes from './routes/game.js';
import testRoutes from './routes/test.js';
import feedbackRoutes from './routes/feedback.js';
import { setupWebSocketServer } from './websocket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

function parseAllowedOrigins(): string[] {
  const fromList = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const single = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
  return Array.from(new Set([single, ...fromList]));
}

function parseSameSite(value: string | undefined): 'lax' | 'strict' | 'none' {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'strict') return 'strict';
  if (normalized === 'none') return 'none';
  return 'lax';
}

// Session store
const PgStore = pgSession(session);

// Middleware
app.use(express.json({ limit: '10mb' }));

// Trust reverse proxy/CDN so secure cookies are set correctly in production
app.set('trust proxy', 1);

// Set server timeout to 5 minutes for long-running AI agent calls
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

// CORS configuration
const allowedOrigins = parseAllowedOrigins();
const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

const sessionSameSite = parseSameSite(
  process.env.SESSION_COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')
);
const sessionCookieSecure =
  process.env.SESSION_COOKIE_SECURE === 'true' ||
  (process.env.SESSION_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');

console.log('🔒 CORS Configuration:');
console.log('  Allowed Origins:', allowedOrigins);
console.log('  Credentials:', corsOptions.credentials);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('🍪 Session Cookie Configuration:');
console.log('  sameSite:', sessionSameSite);
console.log('  secure:', sessionCookieSecure);
console.log('  domain:', process.env.SESSION_COOKIE_DOMAIN || '(host-only)');

app.use(cors(corsOptions));

// Session configuration
app.use(
  session({
    store: new PgStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: sessionCookieSecure,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: sessionSameSite,
      domain: process.env.SESSION_COOKIE_DOMAIN || undefined
    },
    proxy: true
  })
);

// Log all requests with session info
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('  Origin:', req.get('origin'));
  console.log('  Referer:', req.get('referer'));
  if (req.session) {
    console.log('  Session ID:', req.sessionID);
    console.log('  Admin ID:', req.session.adminId);
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/test', testRoutes);
app.use('/api/public', feedbackRoutes);

// Root route for debugging
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Essay Grading Backend API',
    endpoints: ['/api/health', '/api/auth', '/api/public', '/api/admin']
  });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler - must be BEFORE error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  console.error(`❌ 404 Not Found: ${req.method} ${req.originalUrl}`);
  console.error('  Headers:', JSON.stringify(req.headers, null, 2));
  res.status(404).json({ 
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: ['/api/health', '/api/auth', '/api/public', '/api/admin', '/api/game']
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log it
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log it
});

// Start server
const httpServer = createServer(app);

// Setup WebSocket server
const wsHelpers = setupWebSocketServer(httpServer);

// Make WebSocket helpers available to routes via app.locals
app.locals.ws = wsHelpers;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}/ws`);
});

// Set server timeout
httpServer.timeout = 300000; // 5 minutes
