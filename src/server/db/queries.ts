import type { Database } from 'better-sqlite3';

// Type definitions
export interface MintRecord {
  mint_address: string;
  tx_signature: string;
  minted_at: number;
  discovered_at: number;
  token_program: 'spl' | 'token2022';
}

export interface EnrichmentData {
  token_name: string | null;
  token_symbol: string | null;
  price_usd: number | null;
  liquidity_usd: number | null;
  market_cap_usd: number | null;
  fdv_usd: number | null;
  dex_url: string | null;
  pair_address: string | null;
  status: 'qualified' | 'below_threshold' | 'no_pool';
}

export interface MintRow extends MintRecord {
  status: string;
  token_name: string | null;
  token_symbol: string | null;
  price_usd: number | null;
  liquidity_usd: number | null;
  market_cap_usd: number | null;
  fdv_usd: number | null;
  dex_url: string | null;
  pair_address: string | null;
  enriched_at: number | null;
  retry_count: number;
}

export interface FetchLog {
  id: number;
  started_at: number;
  completed_at: number | null;
  window_start: number;
  window_end: number;
  mints_discovered: number;
  mints_qualified: number;
  status: string;
}

export interface Stats {
  totalMints: number;
  qualified: number;
  pending: number;
  noPool: number;
  belowThreshold: number;
}

export interface MintFilters {
  startTime?: number;
  endTime?: number;
  minLiquidity?: number;
  minMarketCap?: number;
  limit?: number;
  offset?: number;
}

// Prepared statements cache
const stmtCache = new WeakMap<Database, Record<string, any>>();

function getStatement(db: Database, key: string, sql: string) {
  let cache = stmtCache.get(db);
  if (!cache) {
    cache = {};
    stmtCache.set(db, cache);
  }
  if (!cache[key]) {
    cache[key] = db.prepare(sql);
  }
  return cache[key];
}

/**
 * Insert a new mint record (deduplication by mint_address)
 */
export function insertMint(db: Database, mint: MintRecord): void {
  const stmt = getStatement(
    db,
    'insertMint',
    `INSERT OR IGNORE INTO mints (
      mint_address,
      tx_signature,
      minted_at,
      discovered_at,
      token_program
    ) VALUES (?, ?, ?, ?, ?)`
  );

  stmt.run(
    mint.mint_address,
    mint.tx_signature,
    mint.minted_at,
    mint.discovered_at,
    mint.token_program
  );
}

/**
 * Get mints with status 'pending' (need DexScreener check)
 */
export function getPendingMints(db: Database): MintRow[] {
  const stmt = getStatement(
    db,
    'getPendingMints',
    `SELECT * FROM mints WHERE status = 'pending' ORDER BY minted_at ASC`
  );

  return stmt.all() as MintRow[];
}

/**
 * Get qualified/below_threshold mints whose enriched_at is older than threshold
 * Used for re-enrichment to update market data
 */
export function getMintsForReenrichment(
  db: Database,
  olderThanSeconds: number
): MintRow[] {
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - olderThanSeconds;

  const stmt = getStatement(
    db,
    'getMintsForReenrichment',
    `SELECT * FROM mints
     WHERE status IN ('qualified', 'below_threshold')
     AND (enriched_at IS NULL OR enriched_at < ?)
     ORDER BY enriched_at ASC NULLS FIRST`
  );

  return stmt.all(cutoffTimestamp) as MintRow[];
}

/**
 * Update mint with DexScreener enrichment data
 */
export function updateMintEnrichment(
  db: Database,
  mintAddress: string,
  data: EnrichmentData
): void {
  const now = Math.floor(Date.now() / 1000);

  const stmt = getStatement(
    db,
    'updateMintEnrichment',
    `UPDATE mints SET
      token_name = ?,
      token_symbol = ?,
      price_usd = ?,
      liquidity_usd = ?,
      market_cap_usd = ?,
      fdv_usd = ?,
      dex_url = ?,
      pair_address = ?,
      status = ?,
      enriched_at = ?
    WHERE mint_address = ?`
  );

  stmt.run(
    data.token_name,
    data.token_symbol,
    data.price_usd,
    data.liquidity_usd,
    data.market_cap_usd,
    data.fdv_usd,
    data.dex_url,
    data.pair_address,
    data.status,
    now,
    mintAddress
  );
}

/**
 * Increment retry count and mark as 'no_pool' if max retries reached
 */
export function incrementRetryCount(
  db: Database,
  mintAddress: string,
  maxRetries: number
): void {
  const stmt = getStatement(
    db,
    'incrementRetryCount',
    `UPDATE mints
     SET retry_count = retry_count + 1,
         status = CASE
           WHEN retry_count + 1 >= ? THEN 'no_pool'
           ELSE status
         END
     WHERE mint_address = ?`
  );

  stmt.run(maxRetries, mintAddress);
}

/**
 * Get filtered qualified mints with pagination
 */
export function getQualifiedMints(
  db: Database,
  filters: MintFilters = {}
): MintRow[] {
  let sql = `SELECT * FROM mints WHERE status = 'qualified'`;
  const params: any[] = [];

  if (filters.startTime) {
    sql += ` AND minted_at >= ?`;
    params.push(filters.startTime);
  }

  if (filters.endTime) {
    sql += ` AND minted_at <= ?`;
    params.push(filters.endTime);
  }

  if (filters.minLiquidity) {
    sql += ` AND liquidity_usd >= ?`;
    params.push(filters.minLiquidity);
  }

  if (filters.minMarketCap) {
    sql += ` AND market_cap_usd >= ?`;
    params.push(filters.minMarketCap);
  }

  sql += ` ORDER BY minted_at DESC`;

  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(filters.limit);
  }

  if (filters.offset) {
    sql += ` OFFSET ?`;
    params.push(filters.offset);
  }

  const stmt = db.prepare(sql);
  return stmt.all(...params) as MintRow[];
}

/**
 * Count total qualified mints matching filters (for pagination)
 */
export function getTotalQualifiedCount(
  db: Database,
  filters: MintFilters = {}
): number {
  let sql = `SELECT COUNT(*) as count FROM mints WHERE status = 'qualified'`;
  const params: any[] = [];

  if (filters.startTime) {
    sql += ` AND minted_at >= ?`;
    params.push(filters.startTime);
  }

  if (filters.endTime) {
    sql += ` AND minted_at <= ?`;
    params.push(filters.endTime);
  }

  if (filters.minLiquidity) {
    sql += ` AND liquidity_usd >= ?`;
    params.push(filters.minLiquidity);
  }

  if (filters.minMarketCap) {
    sql += ` AND market_cap_usd >= ?`;
    params.push(filters.minMarketCap);
  }

  const stmt = db.prepare(sql);
  const result = stmt.get(...params) as { count: number };
  return result.count;
}

/**
 * Get all qualified mints for CSV export (no pagination)
 */
export function getAllMintsCsv(
  db: Database,
  filters: MintFilters = {}
): MintRow[] {
  let sql = `SELECT * FROM mints WHERE status = 'qualified'`;
  const params: any[] = [];

  if (filters.startTime) {
    sql += ` AND minted_at >= ?`;
    params.push(filters.startTime);
  }

  if (filters.endTime) {
    sql += ` AND minted_at <= ?`;
    params.push(filters.endTime);
  }

  if (filters.minLiquidity) {
    sql += ` AND liquidity_usd >= ?`;
    params.push(filters.minLiquidity);
  }

  if (filters.minMarketCap) {
    sql += ` AND market_cap_usd >= ?`;
    params.push(filters.minMarketCap);
  }

  sql += ` ORDER BY minted_at DESC`;

  const stmt = db.prepare(sql);
  return stmt.all(...params) as MintRow[];
}

/**
 * Get the window_end of the most recent completed fetch_log entry
 */
export function getLastFetchTimestamp(db: Database): number | null {
  const stmt = getStatement(
    db,
    'getLastFetchTimestamp',
    `SELECT window_end FROM fetch_log
     WHERE status = 'completed'
     ORDER BY window_end DESC
     LIMIT 1`
  );

  const result = stmt.get() as { window_end: number } | undefined;
  return result?.window_end ?? null;
}

/**
 * Create a new fetch log entry
 */
export function createFetchLog(
  db: Database,
  windowStart: number,
  windowEnd: number
): number {
  const now = Math.floor(Date.now() / 1000);

  const stmt = getStatement(
    db,
    'createFetchLog',
    `INSERT INTO fetch_log (started_at, window_start, window_end)
     VALUES (?, ?, ?)`
  );

  const info = stmt.run(now, windowStart, windowEnd);
  return info.lastInsertRowid as number;
}

/**
 * Mark fetch log as completed with results
 */
export function completeFetchLog(
  db: Database,
  id: number,
  mintsDiscovered: number,
  mintsQualified: number
): void {
  const now = Math.floor(Date.now() / 1000);

  const stmt = getStatement(
    db,
    'completeFetchLog',
    `UPDATE fetch_log
     SET completed_at = ?,
         mints_discovered = ?,
         mints_qualified = ?,
         status = 'completed'
     WHERE id = ?`
  );

  stmt.run(now, mintsDiscovered, mintsQualified, id);
}

/**
 * Mark fetch log as failed
 */
export function failFetchLog(db: Database, id: number, errorMsg?: string): void {
  const now = Math.floor(Date.now() / 1000);

  const stmt = getStatement(
    db,
    'failFetchLog',
    `UPDATE fetch_log
     SET completed_at = ?,
         status = 'failed'
     WHERE id = ?`
  );

  stmt.run(now, id);

  // Log error if provided (could be extended to store in a separate error_log table)
  if (errorMsg) {
    console.error(`Fetch log ${id} failed: ${errorMsg}`);
  }
}

/**
 * Get recent fetch logs
 */
export function getRecentFetchLogs(db: Database, limit: number = 10): FetchLog[] {
  const stmt = getStatement(
    db,
    'getRecentFetchLogs',
    `SELECT * FROM fetch_log
     ORDER BY started_at DESC
     LIMIT ?`
  );

  return stmt.all(limit) as FetchLog[];
}

/**
 * Get statistics about mints
 */
export function getStats(db: Database): Stats {
  const stmt = getStatement(
    db,
    'getStats',
    `SELECT
       COUNT(*) as totalMints,
       SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
       SUM(CASE WHEN status = 'no_pool' THEN 1 ELSE 0 END) as noPool,
       SUM(CASE WHEN status = 'below_threshold' THEN 1 ELSE 0 END) as belowThreshold
     FROM mints`
  );

  const result = stmt.get() as {
    totalMints: number;
    qualified: number | null;
    pending: number | null;
    noPool: number | null;
    belowThreshold: number | null;
  };

  return {
    totalMints: result.totalMints,
    qualified: result.qualified ?? 0,
    pending: result.pending ?? 0,
    noPool: result.noPool ?? 0,
    belowThreshold: result.belowThreshold ?? 0,
  };
}
