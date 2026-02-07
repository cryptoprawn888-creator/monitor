import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { config } from '../config.js';
import {
  getQualifiedMints,
  getTotalQualifiedCount,
  getAllMintsCsv,
  getStats,
  getRecentFetchLogs,
  type MintFilters,
  type MintRow,
} from '../db/queries.js';

function parseFilters(query: Record<string, any>): MintFilters {
  const filters: MintFilters = {};
  if (query.startTime) filters.startTime = Number(query.startTime);
  if (query.endTime) filters.endTime = Number(query.endTime);
  if (query.minLiquidity) filters.minLiquidity = Number(query.minLiquidity);
  if (query.minMarketCap) filters.minMarketCap = Number(query.minMarketCap);
  if (query.limit) filters.limit = Math.min(Number(query.limit), 200);
  if (query.offset) filters.offset = Number(query.offset);
  return filters;
}

function escCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function mintToCsvRow(m: MintRow): string {
  return [
    escCsv(m.mint_address),
    escCsv(m.token_name),
    escCsv(m.token_symbol),
    escCsv(m.price_usd),
    escCsv(m.liquidity_usd),
    escCsv(m.market_cap_usd),
    escCsv(m.fdv_usd),
    escCsv(new Date(m.minted_at * 1000).toISOString()),
    escCsv(`https://solscan.io/token/${m.mint_address}`),
    escCsv(m.dex_url),
    escCsv(m.tx_signature),
  ].join(',');
}

const CSV_HEADER =
  'mint_address,token_name,token_symbol,price_usd,liquidity_usd,market_cap_usd,fdv_usd,minted_at_utc,solscan_url,dex_url,tx_signature';

export function createTokenRoutes(db: Database): Router {
  const router = Router();

  // GET /api/tokens — Paginated qualified tokens
  router.get('/api/tokens', (req, res) => {
    try {
      const filters = parseFilters(req.query);
      if (!filters.limit) filters.limit = 50;
      if (!filters.offset) filters.offset = 0;

      const tokens = getQualifiedMints(db, filters);
      const total = getTotalQualifiedCount(db, filters);

      res.json({
        tokens,
        total,
        limit: filters.limit,
        offset: filters.offset,
      });
    } catch (err) {
      console.error('Error fetching tokens:', err);
      res.status(500).json({ error: 'Failed to fetch tokens' });
    }
  });

  // GET /api/tokens/csv — CSV download
  router.get('/api/tokens/csv', (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const mints = getAllMintsCsv(db, filters);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=tokens-${timestamp}.csv`
      );

      res.write(CSV_HEADER + '\n');
      for (const m of mints) {
        res.write(mintToCsvRow(m) + '\n');
      }
      res.end();
    } catch (err) {
      console.error('Error generating CSV:', err);
      res.status(500).json({ error: 'Failed to generate CSV' });
    }
  });

  // GET /api/stats — Dashboard statistics
  router.get('/api/stats', (req, res) => {
    try {
      const stats = getStats(db);
      const recentFetches = getRecentFetchLogs(db, 10);
      res.json({ stats, recentFetches });
    } catch (err) {
      console.error('Error fetching stats:', err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // GET /api/config — Current thresholds
  router.get('/api/config', (_req, res) => {
    res.json({
      minMarketCapUsd: config.minMarketCapUsd,
      minLiquidityUsd: config.minLiquidityUsd,
      overlapMinutes: config.overlapMinutes,
      cronSchedule: config.cronSchedule,
    });
  });

  return router;
}
