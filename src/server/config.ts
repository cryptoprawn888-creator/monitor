import 'dotenv/config';

export const config = {
  // Helius API
  heliusApiKey: process.env.HELIUS_API_KEY || '',
  heliusBaseUrl: 'https://api-mainnet.helius-rpc.com',
  heliusEnhancedUrl: 'https://api-mainnet.helius-rpc.com/v0',

  // Token Programs to query
  splTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  token2022Program: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',

  // Filter thresholds
  minMarketCapUsd: Number(process.env.MIN_MARKET_CAP_USD) || 10000,
  minLiquidityUsd: Number(process.env.MIN_LIQUIDITY_USD) || 5000,

  // Fetch settings
  overlapMinutes: Number(process.env.OVERLAP_MINUTES) || 30,
  maxRetriesNoPool: Number(process.env.MAX_RETRIES_NO_POOL) || 3,

  // Cron
  cronSchedule: process.env.CRON_SCHEDULE || '0 */8 * * *',

  // Server
  port: Number(process.env.PORT) || 3001,

  // DexScreener
  dexScreenerBaseUrl: 'https://api.dexscreener.com/latest/dex',
  dexScreenerBatchSize: 30,
  dexScreenerRateLimit: 5, // requests per second
} as const;
