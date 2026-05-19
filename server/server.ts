import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env is at project root (/time-log/.env)
// dev runs from server/ -> ../.env, prod runs from server/dist/ -> ../../.env
const projectRoot = path.resolve(__dirname, __dirname.endsWith('/dist') ? '../..' : '..');
dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

// Verify env loaded regardless of source (dotenv or shell export)
const requiredEnvVars = ['APP_PASSWORD', 'JWT_SECRET'] as const;
const missingEnv = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnv.length) {
  console.error(`Missing required env vars: ${missingEnv.join(', ')}`);
  console.error('Create a .env file at project root based on .env.example');
  process.exit(1);
}

async function startServer() {
  await initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 5478;

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/entries', entriesRoutes);

  // Serve built client static files (relative to project root)
  const distPath = path.join(projectRoot, 'client/dist');
  app.use(express.static(distPath));

  // SPA fallback: serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
