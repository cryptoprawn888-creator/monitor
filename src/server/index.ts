import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDb } from './db/schema.js';
import { createTokenRoutes } from './routes/tokens.js';
import { createFetchRoutes } from './routes/fetch.js';
import { runPipeline } from './services/pipeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize database
const db = initDb();
console.log('[server] Database initialized');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use(createTokenRoutes(db));
app.use(createFetchRoutes(db));

// Serve static frontend in production
const clientDist = join(__dirname, '..', '..', 'dist', 'client');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// Set up cron schedule
if (config.cronSchedule && cron.validate(config.cronSchedule)) {
  cron.schedule(config.cronSchedule, () => {
    console.log(`[cron] Scheduled fetch triggered at ${new Date().toISOString()}`);
    runPipeline(db).catch((err) => {
      console.error('[cron] Pipeline failed:', (err as Error).message);
    });
  });
  console.log(`[server] Cron scheduled: ${config.cronSchedule}`);
} else {
  console.log('[server] No valid cron schedule configured, skipping auto-fetch');
}

// Validate API key
if (!config.heliusApiKey || config.heliusApiKey === 'your_helius_api_key_here') {
  console.warn('[server] WARNING: No valid HELIUS_API_KEY set. Fetching will fail.');
  console.warn('[server] Copy .env.example to .env and set your API key.');
}

// Start server
app.listen(config.port, () => {
  console.log(`[server] Listening on http://localhost:${config.port}`);
  console.log(`[server] Thresholds: minMcap=$${config.minMarketCapUsd}, minLiquidity=$${config.minLiquidityUsd}`);
});
