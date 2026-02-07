import { useState, useEffect, useCallback } from 'react';
import Filters from './components/Filters';
import FetchStatus from './components/FetchStatus';
import TokenTable from './components/TokenTable';

export interface MintRow {
  mint_address: string;
  tx_signature: string;
  minted_at: number;
  discovered_at: number;
  token_program: string;
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

export interface FilterState {
  startTime: string;
  endTime: string;
  minLiquidity: string;
  minMarketCap: string;
}

export interface Stats {
  totalMints: number;
  qualified: number;
  pending: number;
  noPool: number;
  belowThreshold: number;
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

function buildQuery(filters: FilterState, limit: number, offset: number): string {
  const params = new URLSearchParams();
  if (filters.startTime) {
    params.set('startTime', String(Math.floor(new Date(filters.startTime).getTime() / 1000)));
  }
  if (filters.endTime) {
    params.set('endTime', String(Math.floor(new Date(filters.endTime).getTime() / 1000)));
  }
  if (filters.minLiquidity) params.set('minLiquidity', filters.minLiquidity);
  if (filters.minMarketCap) params.set('minMarketCap', filters.minMarketCap);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params.toString();
}

export default function App() {
  const [filters, setFilters] = useState<FilterState>({
    startTime: '',
    endTime: '',
    minLiquidity: '',
    minMarketCap: '',
  });
  const [tokens, setTokens] = useState<MintRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentFetches, setRecentFetches] = useState<FetchLog[]>([]);
  const limit = 50;

  const fetchTokens = useCallback(async (newOffset = 0) => {
    setLoading(true);
    try {
      const query = buildQuery(filters, limit, newOffset);
      const res = await fetch(`/api/tokens?${query}`);
      const data = await res.json();
      setTokens(data.tokens);
      setTotal(data.total);
      setOffset(newOffset);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data.stats);
      setRecentFetches(data.recentFetches);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchTokens(0);
    fetchStats();
  }, []);

  const handleSearch = () => {
    fetchTokens(0);
    fetchStats();
  };

  const handleCsvDownload = () => {
    const query = buildQuery(filters, 0, 0);
    // Remove limit and offset for CSV
    const params = new URLSearchParams(query);
    params.delete('limit');
    params.delete('offset');
    window.open(`/api/tokens/csv?${params.toString()}`, '_blank');
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Solana Token Mint Monitor</h1>

      <FetchStatus
        stats={stats}
        recentFetches={recentFetches}
        onFetchComplete={() => { fetchTokens(0); fetchStats(); }}
      />

      <Filters
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onCsvDownload={handleCsvDownload}
        total={total}
      />

      <TokenTable
        tokens={tokens}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        onPrev={() => fetchTokens(Math.max(0, offset - limit))}
        onNext={() => fetchTokens(offset + limit)}
      />
    </div>
  );
}
