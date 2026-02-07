import type { MintRow } from '../App';

interface TokenTableProps {
  tokens: MintRow[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

function truncate(s: string, len = 8): string {
  if (s.length <= len * 2 + 3) return s;
  return s.slice(0, len) + '...' + s.slice(-len);
}

function formatUsd(val: number | null): string {
  if (val === null) return '-';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function formatPrice(val: number | null): string {
  if (val === null) return '-';
  if (val < 0.000001) return `$${val.toExponential(2)}`;
  if (val < 0.01) return `$${val.toFixed(8)}`;
  return `$${val.toFixed(4)}`;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TokenTable({
  tokens,
  loading,
  currentPage,
  totalPages,
  total,
  onPrev,
  onNext,
}: TokenTableProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-500">
        No qualified tokens found. Try adjusting filters or running a fetch.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
              <th className="text-left py-3 px-3">Token</th>
              <th className="text-left py-3 px-3">Mint Address</th>
              <th className="text-right py-3 px-3">Price</th>
              <th className="text-right py-3 px-3">Liquidity</th>
              <th className="text-right py-3 px-3">Market Cap</th>
              <th className="text-right py-3 px-3">FDV</th>
              <th className="text-left py-3 px-3">Minted</th>
              <th className="text-center py-3 px-3">Links</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr
                key={token.mint_address}
                className="border-b border-gray-800/50 hover:bg-gray-800/50"
              >
                <td className="py-2.5 px-3">
                  <div className="font-medium">{token.token_symbol || '???'}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[150px]">
                    {token.token_name || 'Unknown'}
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono text-xs text-gray-400">
                  {truncate(token.mint_address)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatPrice(token.price_usd)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-blue-300">
                  {formatUsd(token.liquidity_usd)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-green-300">
                  {formatUsd(token.market_cap_usd)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-400">
                  {formatUsd(token.fdv_usd)}
                </td>
                <td className="py-2.5 px-3 text-xs text-gray-400">
                  {formatTime(token.minted_at)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <div className="flex justify-center gap-2">
                    <a
                      href={`https://solscan.io/token/${token.mint_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Solscan
                    </a>
                    {token.dex_url && (
                      <a
                        href={token.dex_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-400 hover:text-green-300 underline"
                      >
                        DEX
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
        <span className="text-xs text-gray-400">
          Showing {tokens.length} of {total.toLocaleString()} qualified tokens
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded"
          >
            Prev
          </button>
          <span className="text-xs text-gray-400">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={onNext}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
