import type { Database } from 'better-sqlite3';
import { config } from '../config.js';
import {
  insertMint,
  getPendingMints,
  getMintsForReenrichment,
  updateMintEnrichment,
  incrementRetryCount,
  getLastFetchTimestamp,
  createFetchLog,
  completeFetchLog,
  failFetchLog,
} from '../db/queries.js';
import { discoverMints } from './helius.js';
import { enrichMints } from './dexscreener.js';

let pipelineRunning = false;
let pipelineProgress = '';

export function getPipelineStatus(): { running: boolean; progress: string } {
  return { running: pipelineRunning, progress: pipelineProgress };
}

export async function runPipeline(
  db: Database
): Promise<{ discovered: number; qualified: number }> {
  if (pipelineRunning) {
    throw new Error('Pipeline is already running');
  }

  pipelineRunning = true;
  pipelineProgress = 'Starting...';
  let fetchLogId: number | null = null;

  try {
    // Determine time window
    const now = Math.floor(Date.now() / 1000);
    const endTime = now;
    const lastFetch = getLastFetchTimestamp(db);

    let startTime: number;
    if (lastFetch) {
      // Overlap by configured minutes to avoid gaps
      startTime = lastFetch - config.overlapMinutes * 60;
    } else {
      // First run: look back 24 hours
      startTime = now - 24 * 60 * 60;
    }

    console.log(`[pipeline] Window: ${new Date(startTime * 1000).toISOString()} → ${new Date(endTime * 1000).toISOString()}`);
    if (lastFetch) {
      console.log(`[pipeline] Last fetch ended at ${new Date(lastFetch * 1000).toISOString()}, overlap: ${config.overlapMinutes}min`);
    } else {
      console.log(`[pipeline] First run, looking back 24 hours`);
    }

    // Create fetch log
    fetchLogId = createFetchLog(db, startTime, endTime);

    // ── Stage 1: Discover mints from both token programs ──
    pipelineProgress = 'Stage 1: Discovering mints from SPL Token Program...';

    const [splMints, token2022Mints] = await Promise.all([
      discoverMints(config.splTokenProgram, startTime, endTime, (page, found) => {
        pipelineProgress = `Stage 1: SPL page ${page}, ${found} mints found...`;
      }),
      discoverMints(config.token2022Program, startTime, endTime, (page, found) => {
        pipelineProgress = `Stage 1: Token-2022 page ${page}, ${found} mints found...`;
      }),
    ]);

    const allMints = [...splMints, ...token2022Mints];
    console.log(`[pipeline] Stage 1 complete: ${splMints.length} SPL + ${token2022Mints.length} Token-2022 = ${allMints.length} total`);

    // Insert into DB (INSERT OR IGNORE handles deduplication)
    pipelineProgress = `Saving ${allMints.length} mints to database...`;
    for (const mint of allMints) {
      insertMint(db, mint);
    }

    // ── Stage 2a: Enrich pending mints ──
    const pendingMints = getPendingMints(db);
    console.log(`[pipeline] Stage 2a: ${pendingMints.length} pending mints to enrich`);

    let qualifiedCount = 0;

    if (pendingMints.length > 0) {
      pipelineProgress = `Stage 2a: Enriching ${pendingMints.length} new mints...`;
      const pendingAddresses = pendingMints.map((m) => m.mint_address);
      const enrichmentResults = await enrichMints(pendingAddresses, (batch, total) => {
        pipelineProgress = `Stage 2a: Enriching batch ${batch}/${total}...`;
      });

      for (const mint of pendingMints) {
        const data = enrichmentResults.get(mint.mint_address);
        if (data) {
          updateMintEnrichment(db, mint.mint_address, data);
          if (data.status === 'qualified') qualifiedCount++;
        } else {
          // Not found on DexScreener — increment retry
          incrementRetryCount(db, mint.mint_address, config.maxRetriesNoPool);
        }
      }
    }

    // ── Stage 2b: Re-enrich existing tokens ──
    const staleMinutes = 4 * 3600; // re-check if enriched_at > 4 hours ago
    const staleMints = getMintsForReenrichment(db, staleMinutes);
    console.log(`[pipeline] Stage 2b: ${staleMints.length} stale mints to re-enrich`);

    if (staleMints.length > 0) {
      pipelineProgress = `Stage 2b: Re-enriching ${staleMints.length} existing mints...`;
      const staleAddresses = staleMints.map((m) => m.mint_address);
      const reEnrichResults = await enrichMints(staleAddresses, (batch, total) => {
        pipelineProgress = `Stage 2b: Re-enriching batch ${batch}/${total}...`;
      });

      for (const mint of staleMints) {
        const data = reEnrichResults.get(mint.mint_address);
        if (data) {
          updateMintEnrichment(db, mint.mint_address, data);
          if (data.status === 'qualified') qualifiedCount++;
        }
      }
    }

    // Complete fetch log
    completeFetchLog(db, fetchLogId, allMints.length, qualifiedCount);

    pipelineProgress = `Done: ${allMints.length} discovered, ${qualifiedCount} qualified`;
    console.log(`[pipeline] Complete: ${allMints.length} discovered, ${qualifiedCount} qualified`);

    return { discovered: allMints.length, qualified: qualifiedCount };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[pipeline] Failed:`, msg);
    pipelineProgress = `Failed: ${msg}`;
    if (fetchLogId !== null) {
      failFetchLog(db, fetchLogId, msg);
    }
    throw err;
  } finally {
    pipelineRunning = false;
  }
}
