import { config } from '../config.js';
import type { EnrichmentData } from '../db/queries.js';

// DexScreener API response types
interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  marketCap: number;
  fdv: number;
  volume: {
    h24: number;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        console.warn(`[dexscreener] Rate limited, backing off ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      const backoff = Math.pow(2, attempt + 1) * 1000;
      console.warn(`[dexscreener] Fetch failed, retry ${attempt + 1} in ${backoff}ms...`, (err as Error).message);
      await sleep(backoff);
    }
  }
  throw new Error('Unreachable');
}

function determineStatus(
  liquidityUsd: number | null,
  marketCapUsd: number | null,
  fdvUsd: number | null
): EnrichmentData['status'] {
  if (liquidityUsd === null || liquidityUsd === 0) return 'no_pool';

  const meetsLiquidity = liquidityUsd >= config.minLiquidityUsd;
  const meetsMarketCap =
    (marketCapUsd !== null && marketCapUsd >= config.minMarketCapUsd) ||
    (fdvUsd !== null && fdvUsd >= config.minMarketCapUsd);

  return meetsLiquidity && meetsMarketCap ? 'qualified' : 'below_threshold';
}

async function fetchBatch(addresses: string[]): Promise<DexPair[]> {
  const joined = addresses.join(',');
  const url = `https://api.dexscreener.com/tokens/v1/solana/${joined}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  // The v1 endpoint returns an array of pairs directly
  if (Array.isArray(data)) return data as DexPair[];
  // Fallback: some versions return { pairs: [...] }
  if (data && Array.isArray(data.pairs)) return data.pairs as DexPair[];
  return [];
}

export async function enrichMints(
  mintAddresses: string[],
  onProgress?: (batch: number, totalBatches: number) => void
): Promise<Map<string, EnrichmentData>> {
  const results = new Map<string, EnrichmentData>();

  if (mintAddresses.length === 0) return results;

  // Split into batches of 30
  const batches: string[][] = [];
  for (let i = 0; i < mintAddresses.length; i += config.dexScreenerBatchSize) {
    batches.push(mintAddresses.slice(i, i + config.dexScreenerBatchSize));
  }

  console.log(`[dexscreener] Enriching ${mintAddresses.length} mints in ${batches.length} batches`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    onProgress?.(i + 1, batches.length);

    try {
      const pairs = await fetchBatch(batch);

      // Group pairs by base token address and pick highest liquidity
      const bestPairByToken = new Map<string, DexPair>();

      for (const pair of pairs) {
        // Only consider Solana pairs
        if (pair.chainId !== 'solana') continue;

        const addr = pair.baseToken.address;
        const existing = bestPairByToken.get(addr);

        if (
          !existing ||
          (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)
        ) {
          bestPairByToken.set(addr, pair);
        }
      }

      // Build enrichment data for each address in the batch
      for (const addr of batch) {
        const pair = bestPairByToken.get(addr);
        if (pair) {
          const liquidityUsd = pair.liquidity?.usd ?? null;
          const marketCapUsd = pair.marketCap ?? null;
          const fdvUsd = pair.fdv ?? null;

          results.set(addr, {
            token_name: pair.baseToken.name || null,
            token_symbol: pair.baseToken.symbol || null,
            price_usd: pair.priceUsd ? parseFloat(pair.priceUsd) : null,
            liquidity_usd: liquidityUsd,
            market_cap_usd: marketCapUsd,
            fdv_usd: fdvUsd,
            dex_url: pair.url || null,
            pair_address: pair.pairAddress || null,
            status: determineStatus(liquidityUsd, marketCapUsd, fdvUsd),
          });
        }
        // If addr not in bestPairByToken, it's not in results → caller handles as no_pool candidate
      }
    } catch (err) {
      console.error(`[dexscreener] Batch ${i + 1} failed:`, (err as Error).message);
      // Continue with next batch rather than failing everything
    }

    // Rate limit: 5 req/sec
    if (i < batches.length - 1) {
      await sleep(1000 / config.dexScreenerRateLimit);
    }
  }

  console.log(`[dexscreener] Done: enriched ${results.size}/${mintAddresses.length} mints`);
  return results;
}
