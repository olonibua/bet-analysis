'use client';

import { useEffect, useState } from 'react';
import { COMPETITIONS } from '@/lib/football-api';

interface LeagueSelectorProps {
  onLeagueSelect: (league: string) => void;
  loading: boolean;
  selectedLeague: string | null;
}

const LEAGUE_NAMES = {
  [COMPETITIONS.PREMIER_LEAGUE]: 'Premier League',
  [COMPETITIONS.LA_LIGA]: 'La Liga',
  [COMPETITIONS.BUNDESLIGA]: 'Bundesliga',
  [COMPETITIONS.SERIE_A]: 'Serie A',
  [COMPETITIONS.LIGUE_1]: 'Ligue 1',
  [COMPETITIONS.CHAMPIONS_LEAGUE]: 'Champions League',
  [COMPETITIONS.EUROPA_LEAGUE]: 'Europa League',
} as const;

export function LeagueSelector({ onLeagueSelect, loading, selectedLeague }: LeagueSelectorProps) {
  const [progress, setProgress] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(0);

  // Estimated time in seconds for a league sync (1-2 minutes)
  const ESTIMATED_TIME = 90;

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setEstimatedTimeLeft(0);
      return;
    }

    setProgress(0);
    setEstimatedTimeLeft(ESTIMATED_TIME);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 15;
      });

      setEstimatedTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return 'Completing...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Select League to Load Data
      </h2>

      {/* Main Leagues */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {Object.entries(LEAGUE_NAMES).map(([code, name]) => (
          <button
            key={code}
            onClick={() => onLeagueSelect(code)}
            disabled={loading}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200
              ${selectedLeague === code
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              flex flex-col items-center text-center
            `}
          >
            <div className="text-2xl mb-2">
              {getLeagueIcon(code)}
            </div>
            <span className="text-sm font-medium">{name}</span>
            {loading && selectedLeague === code && (
              <div className="mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Loading State with Progress Bar */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <div className="flex-1">
              <p className="text-blue-800 font-medium">
                Loading {selectedLeague ? LEAGUE_NAMES[selectedLeague as keyof typeof LEAGUE_NAMES] : 'data'}...
              </p>
              <p className="text-blue-600 text-sm mt-1">
                Fetching fixtures and calculating probabilities. This may take a few minutes.
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-700 font-semibold text-lg">
                {formatTime(estimatedTimeLeft)}
              </p>
              <p className="text-blue-600 text-xs">
                Time remaining
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-700">Progress</span>
              <span className="text-xs font-medium text-blue-700">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Stage Indicators */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={`text-center p-2 rounded ${progress >= 30 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              <p className="font-medium">Fetching Data</p>
              <p className="text-sm">{progress >= 30 ? 'Done' : 'Waiting'}</p>
            </div>
            <div className={`text-center p-2 rounded ${progress >= 65 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              <p className="font-medium">Processing</p>
              <p className="text-sm">{progress >= 65 ? 'Done' : 'Waiting'}</p>
            </div>
            <div className={`text-center p-2 rounded ${progress >= 95 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              <p className="font-medium">Finalizing</p>
              <p className="text-sm">{progress >= 95 ? 'Done' : 'Waiting'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          💡 <strong>Pro tip:</strong> Start with Premier League or La Liga for the best data coverage.
          Each league loads independently to avoid rate limits.
        </p>
      </div>
    </div>
  );
}

function getLeagueIcon(code: string): string {
  switch (code) {
    case COMPETITIONS.PREMIER_LEAGUE:
      return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    case COMPETITIONS.LA_LIGA:
      return '🇪🇸';
    case COMPETITIONS.BUNDESLIGA:
      return '🇩🇪';
    case COMPETITIONS.SERIE_A:
      return '🇮🇹';
    case COMPETITIONS.LIGUE_1:
      return '🇫🇷';
    case COMPETITIONS.CHAMPIONS_LEAGUE:
      return '🏆';
    case COMPETITIONS.EUROPA_LEAGUE:
      return '🥈';
    default:
      return '⚽';
  }
}