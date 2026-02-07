import type { FilterState } from '../App';

interface FiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onSearch: () => void;
  onCsvDownload: () => void;
  total: number;
}

function hoursAgo(h: number): string {
  const d = new Date(Date.now() - h * 3600 * 1000);
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

function nowLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

export default function Filters({ filters, onChange, onSearch, onCsvDownload, total }: FiltersProps) {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const setPreset = (hours: number) => {
    onChange({
      ...filters,
      startTime: hoursAgo(hours),
      endTime: nowLocal(),
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <input
            type="datetime-local"
            value={filters.startTime}
            onChange={(e) => update('startTime', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <input
            type="datetime-local"
            value={filters.endTime}
            onChange={(e) => update('endTime', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min Liquidity ($)</label>
          <input
            type="number"
            placeholder="5000"
            value={filters.minLiquidity}
            onChange={(e) => update('minLiquidity', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min Market Cap ($)</label>
          <input
            type="number"
            placeholder="10000"
            value={filters.minMarketCap}
            onChange={(e) => update('minMarketCap', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">Presets:</span>
        <button onClick={() => setPreset(8)} className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
          Last 8h
        </button>
        <button onClick={() => setPreset(24)} className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
          Last 24h
        </button>
        <button onClick={() => setPreset(72)} className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
          Last 3d
        </button>
        <button onClick={() => setPreset(168)} className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
          Last 7d
        </button>

        <div className="flex-1" />

        <button
          onClick={onSearch}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded font-medium"
        >
          Search
        </button>
        <button
          onClick={onCsvDownload}
          disabled={total === 0}
          className="px-4 py-1.5 text-sm bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded font-medium"
        >
          Download CSV ({total})
        </button>
      </div>
    </div>
  );
}
