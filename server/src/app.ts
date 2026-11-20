import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import protectedRoutes from './routes/protectedRoutes.js';
import surveyRoutes from './routes/surveyRoutes.js';
import responseRoutes from './routes/responseRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe for cloud / container checks
app.get('/api/ready', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Mount authentication routes on /api/auth and /api/v1/auth
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

// Mount survey management routes
app.use('/api/surveys', surveyRoutes);
app.use('/api/v1/surveys', surveyRoutes);

// Mount response receipts routes
app.use('/api/responses', responseRoutes);
app.use('/api/v1/responses', responseRoutes);

// Mount role & ownership protected test routes only outside production
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', protectedRoutes);
  app.use('/api/v1', protectedRoutes);
}

// Serve client built static SPA if dist directory exists (Unified Production Container)
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'), // running from server/src or server/dist locally
  path.resolve('/app/client/dist'),             // inside Docker production container
  path.resolve(__dirname, '../client/dist'),
];

let clientDistPath: string | null = null;
for (const p of clientDistCandidates) {
  if (fs.existsSync(p)) {
    clientDistPath = p;
    break;
  }
}

if (clientDistPath) {
  app.use(express.static(clientDistPath));

  // Client-side SPA routing fallback (skip for /api/* requests)
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath!, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

// Catch-all 404 for when static client is not present
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

// Centralized error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server',
    },
  });
});
