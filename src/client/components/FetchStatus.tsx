import { useState, useEffect, useRef } from 'react';
import type { Stats, FetchLog } from '../App';

interface FetchStatusProps {
  stats: Stats | null;
  recentFetches: FetchLog[];
  onFetchComplete: () => void;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function FetchStatus({ stats, recentFetches, onFetchComplete }: FetchStatusProps) {
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [triggering, setTriggering] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = async () => {
    try {
      const res = await fetch('/api/fetch/status');
      const data = await res.json();
      setPipelineRunning(data.running);
      setProgress(data.progress || '');
      if (!data.running && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        onFetchComplete();
      }
    } catch {
      // ignore
    }
  };

  const triggerFetch = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/fetch/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'started') {
        setPipelineRunning(true);
        setProgress('Starting...');
      }
    } catch (err) {
      console.error('Failed to trigger fetch:', err);
    } finally {
      setTriggering(false);
    }
  };

  // Start polling when pipeline is running
  useEffect(() => {
    if (pipelineRunning && !pollRef.current) {
      pollRef.current = setInterval(pollStatus, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pipelineRunning]);

  // Check status on mount
  useEffect(() => {
    pollStatus();
  }, []);

  const lastFetch = recentFetches.find((f) => f.status === 'completed');

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          {stats && (
            <>
              <div>
                <span className="text-gray-400">Total mints:</span>{' '}
                <span className="font-mono">{stats.totalMints.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-green-400">Qualified:</span>{' '}
                <span className="font-mono">{stats.qualified.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-yellow-400">Pending:</span>{' '}
                <span className="font-mono">{stats.pending.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Below threshold:</span>{' '}
                <span className="font-mono">{stats.belowThreshold.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">No pool:</span>{' '}
                <span className="font-mono">{stats.noPool.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Fetch trigger */}
        <div className="flex items-center gap-3">
          {lastFetch && (
            <span className="text-xs text-gray-400">
              Last fetch: {timeAgo(lastFetch.completed_at || lastFetch.started_at)}
              {' '}({lastFetch.mints_discovered} found, {lastFetch.mints_qualified} qualified)
            </span>
          )}
          <button
            onClick={triggerFetch}
            disabled={pipelineRunning || triggering}
            className="px-4 py-1.5 text-sm bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium whitespace-nowrap"
          >
            {pipelineRunning ? 'Running...' : 'Fetch Now'}
          </button>
        </div>
      </div>

      {/* Pipeline progress */}
      {pipelineRunning && progress && (
        <div className="mt-3 text-sm text-blue-300 animate-pulse">
          {progress}
        </div>
      )}
    </div>
  );
}
