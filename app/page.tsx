'use client';

import { useState } from 'react';
import { LeagueSelector } from './components/LeagueSelector';
import { ProgressTracker } from './components/ProgressTracker';
import { MatchCard } from './components/MatchCard';
import { EventWithProbabilities } from '@/lib/types';

export default function Dashboard() {
  const [matches, setMatches] = useState<EventWithProbabilities[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentMatch: string;
    stage: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  const handleLeagueLoad = async (league: string, matchCount: number) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedLeague(league);
      setMatches([]);

      // Initialize progress
      setProgress({
        current: 0,
        total: matchCount,
        currentMatch: 'Starting...',
        stage: 'Fetching fixtures'
      });

      // Call sync API with league and match count
      const response = await fetch(
        `/api/sync?action=load&league=${league}&count=${matchCount}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to load matches');
      }

      // Read streaming progress updates
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'progress') {
                setProgress(data.progress);
              } else if (data.type === 'complete') {
                setMatches(data.matches);
                setProgress(null);
              } else if (data.type === 'error') {
                setError(data.error);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading league:', err);
      setError(err instanceof Error ? err.message : 'Failed to load matches');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BetAnalyst</h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-Powered Football Match Predictions
              </p>
            </div>
            {selectedLeague && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Selected League</p>
                <p className="text-lg font-semibold text-blue-600">
                  {selectedLeague}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* League Selection Page */}
        {matches.length === 0 && (
          <>
            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-sm">
                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        setMatches([]);
                        setSelectedLeague(null);
                      }}
                      className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                      Try Another League
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* League Selector */}
            {!loading && !progress && (
              <LeagueSelector
                onLeagueLoad={handleLeagueLoad}
                disabled={loading}
              />
            )}

            {/* Progress Tracker */}
            {progress && (
              <ProgressTracker
                current={progress.current}
                total={progress.total}
                currentMatch={progress.currentMatch}
                stage={progress.stage}
              />
            )}

            {/* Empty State */}
            {!loading && !progress && !error && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a League to Get Started
                </h3>
                <p className="text-gray-600">
                  Choose a league and match count to load AI-powered predictions
                </p>
              </div>
            )}
          </>
        )}

        {/* Matches Results Page */}
        {matches.length > 0 && !loading && (
          <div>
            {/* Back Button */}
            <button
              onClick={() => {
                setMatches([]);
                setSelectedLeague(null);
                setError(null);
              }}
              className="mb-6 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to League Selection
            </button>

            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Match Predictions ({matches.length})
              </h2>
              <p className="text-gray-600">
                {selectedLeague} - AI-powered betting predictions
              </p>
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => (
                <MatchCard key={match.$id} match={match} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
          <p>
            Predictions powered by AI analysis of historical data, team form,
            and statistical patterns.
          </p>
          <p className="mt-1">For educational purposes only.</p>
        </div>
      </footer>
    </div>
  );
}
