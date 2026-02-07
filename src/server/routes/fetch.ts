import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { runPipeline, getPipelineStatus } from '../services/pipeline.js';

export function createFetchRoutes(db: Database): Router {
  const router = Router();

  // POST /api/fetch/trigger — Manual fetch trigger
  router.post('/api/fetch/trigger', (_req, res) => {
    const status = getPipelineStatus();
    if (status.running) {
      res.json({ status: 'already_running', progress: status.progress });
      return;
    }

    // Run pipeline in background (don't await)
    runPipeline(db).catch((err) => {
      console.error('[fetch] Pipeline failed:', (err as Error).message);
    });

    res.json({ status: 'started' });
  });

  // GET /api/fetch/status — Pipeline status
  router.get('/api/fetch/status', (_req, res) => {
    const status = getPipelineStatus();
    res.json(status);
  });

  return router;
}
