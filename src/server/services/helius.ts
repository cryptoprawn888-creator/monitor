import { config } from '../config.js';
import type { MintRecord } from '../db/queries.js';

// Helius Enhanced Transaction response types
interface TokenTransfer {
  mint: string;
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  tokenStandard: string;
}

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  tokenTransfers: TokenTransfer[];
  description: string;
  fee: number;
  feePayer: string;
  slot: number;
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
        console.warn(`Rate limited, backing off ${backoff}ms...`);
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
      console.warn(`Fetch failed, retry ${attempt + 1} in ${backoff}ms...`, (err as Error).message);
      await sleep(backoff);
    }
  }
  throw new Error('Unreachable');
}

async function fetchPage(
  programAddress: string,
  beforeSignature?: string
): Promise<HeliusTransaction[]> {
  let url = `${config.heliusEnhancedUrl}/addresses/${programAddress}/transactions?api-key=${config.heliusApiKey}&type=TOKEN_MINT&limit=100`;
  if (beforeSignature) {
    url += `&before=${beforeSignature}`;
  }
  const response = await fetchWithRetry(url);
  return (await response.json()) as HeliusTransaction[];
}

export async function discoverMints(
  programAddress: string,
  startTime: number,
  endTime: number,
  onProgress?: (page: number, found: number) => void
): Promise<MintRecord[]> {
  const mints: MintRecord[] = [];
  const seenAddresses = new Set<string>();
  let beforeSignature: string | undefined;
  let page = 0;
  const programLabel = programAddress === config.splTokenProgram ? 'spl' : 'token2022';

  console.log(`[helius] Discovering ${programLabel} mints from ${new Date(startTime * 1000).toISOString()} to ${new Date(endTime * 1000).toISOString()}`);

  while (true) {
    page++;
    const transactions = await fetchPage(programAddress, beforeSignature);

    if (transactions.length === 0) {
      console.log(`[helius] Page ${page}: empty, stopping`);
      break;
    }

    let reachedStart = false;

    for (const tx of transactions) {
      // Skip if outside our end boundary (still paginating to reach window)
      if (tx.timestamp > endTime) continue;

      // Stop if we've gone past our start boundary
      if (tx.timestamp < startTime) {
        reachedStart = true;
        break;
      }

      // Extract mint address from tokenTransfers
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        const mintAddress = tx.tokenTransfers[0].mint;
        if (mintAddress && !seenAddresses.has(mintAddress)) {
          seenAddresses.add(mintAddress);
          mints.push({
            mint_address: mintAddress,
            tx_signature: tx.signature,
            minted_at: tx.timestamp,
            discovered_at: Math.floor(Date.now() / 1000),
            token_program: programLabel,
          });
        }
      }
    }

    onProgress?.(page, mints.length);
    console.log(`[helius] Page ${page}: ${transactions.length} txns, ${mints.length} unique mints so far`);

    if (reachedStart) {
      console.log(`[helius] Reached start boundary, stopping`);
      break;
    }

    // Set up pagination cursor for next page
    beforeSignature = transactions[transactions.length - 1].signature;

    // Rate limit: ~10 RPS on free tier
    await sleep(110);
  }

  console.log(`[helius] Done: ${mints.length} unique ${programLabel} mints discovered over ${page} pages`);
  return mints;
}
