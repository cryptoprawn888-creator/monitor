# Solana Token Mint Monitor

Discovers newly minted Solana tokens via the Helius API, filters them by liquidity pool and market cap using DexScreener, and displays results in a web UI with CSV export.

## How It Works

The app runs a three-stage pipeline (manually or on a cron schedule):

1. **Discover** — Queries Helius Enhanced Transactions API for `TOKEN_MINT` events on both SPL Token and Token-2022 programs within a time window
2. **Enrich** — Batch-checks discovered tokens on DexScreener for liquidity pools, market cap, price, and metadata
3. **Filter** — Tokens meeting the configured liquidity and market cap thresholds are marked as "qualified" and shown in the UI

Results are stored in a local SQLite database so nothing is lost between sessions. Each fetch uses an overlapping time window (configurable, default 30 min) to avoid missing tokens at the boundaries.

## Quick Start

```bash
# Install dependencies
npm install

# Configure your Helius API key
cp .env.example .env
# Edit .env and set HELIUS_API_KEY

# Start dev server (backend on :3001, frontend on :5173)
npm run dev
```

Open `http://localhost:5173` in your browser. Click **Fetch Now** to run the pipeline.

## Configuration

All settings are in `.env` (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `HELIUS_API_KEY` | (required) | Your Helius API key |
| `MIN_MARKET_CAP_USD` | `10000` | Minimum market cap to qualify |
| `MIN_LIQUIDITY_USD` | `5000` | Minimum LP liquidity to qualify |
| `OVERLAP_MINUTES` | `30` | Overlap between fetch windows to prevent gaps |
| `MAX_RETRIES_NO_POOL` | `3` | Retries before marking a token as "no pool" |
| `CRON_SCHEDULE` | `0 */8 * * *` | Auto-fetch schedule (every 8 hours) |
| `PORT` | `3001` | Backend server port |

## Features

- **Time range filters** with presets (8h, 24h, 3d, 7d)
- **Configurable thresholds** for min liquidity and market cap
- **Solscan links** for each token + DexScreener links when available
- **CSV export** of all qualified tokens matching current filters
- **Auto-fetch** via cron schedule + manual **Fetch Now** button
- **Re-enrichment** of previously qualified tokens to keep market data fresh
- **Overlap windows** between fetches to avoid missing tokens

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Express, TypeScript |
| Database | SQLite (better-sqlite3, WAL mode) |
| Scheduler | node-cron |
| APIs | Helius Enhanced Transactions, DexScreener |

## Project Structure

```
src/
├── client/                  # React frontend
│   ├── App.tsx              # Main app with state management
│   └── components/
│       ├── Filters.tsx      # Date range + threshold inputs
│       ├── FetchStatus.tsx  # Pipeline status + trigger button
│       └── TokenTable.tsx   # Results table with pagination
└── server/                  # Express backend
    ├── index.ts             # Server entry + cron setup
    ├── config.ts            # Environment configuration
    ├── db/
    │   ├── schema.ts        # SQLite schema initialization
    │   └── queries.ts       # Typed query functions
    ├── routes/
    │   ├── tokens.ts        # GET /api/tokens, /api/tokens/csv, /api/stats
    │   └── fetch.ts         # POST /api/fetch/trigger, GET /api/fetch/status
    └── services/
        ├── helius.ts        # Stage 1: discover mints from Helius
        ├── dexscreener.ts   # Stage 2: enrich via DexScreener
        └── pipeline.ts      # Orchestrates stages 1 + 2
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tokens` | GET | Paginated qualified tokens (supports `startTime`, `endTime`, `minLiquidity`, `minMarketCap`, `limit`, `offset`) |
| `/api/tokens/csv` | GET | CSV download of qualified tokens |
| `/api/stats` | GET | Database stats + recent fetch logs |
| `/api/config` | GET | Current threshold configuration |
| `/api/fetch/trigger` | POST | Start a pipeline run |
| `/api/fetch/status` | GET | Check if pipeline is running + progress |
