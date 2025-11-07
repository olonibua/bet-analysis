'use client';

interface LeagueSelectorProps {
  onLeagueLoad: (league: string, matchCount: number) => void;
  disabled?: boolean;
}

const LEAGUES = [
  { code: 'PL', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', fullName: 'Premier League' },
  { code: 'PD', name: 'La Liga', flag: '🇪🇸', fullName: 'Primera Division' },
  { code: 'BL1', name: 'Bundesliga', flag: '🇩🇪', fullName: 'Bundesliga' },
  { code: 'SA', name: 'Serie A', flag: '🇮🇹', fullName: 'Serie A' },
  { code: 'FL1', name: 'Ligue 1', flag: '🇫🇷', fullName: 'Ligue 1' },
  { code: 'CL', name: 'Champions League', flag: '🏆', fullName: 'UEFA Champions League' },
];

const MATCH_COUNTS = [
  { value: 3, label: '3 Matches', description: 'Quick analysis' },
  { value: 5, label: '5 Matches', description: 'Balanced' },
  { value: 10, label: '10 Matches', description: 'Comprehensive' },
];

export function LeagueSelector({ onLeagueLoad, disabled }: LeagueSelectorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select a League
        </h2>
        <p className="text-gray-600">
          Choose a league and how many matches to analyze
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {LEAGUES.map((league) => (
          <div
            key={league.code}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">{league.flag}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{league.name}</h3>
                <p className="text-xs text-gray-500">{league.code}</p>
              </div>
            </div>

            <div className="space-y-2">
              {MATCH_COUNTS.map((count) => (
                <button
                  key={count.value}
                  onClick={() => onLeagueLoad(league.fullName, count.value)}
                  disabled={disabled}
                  className="w-full px-4 py-2.5 text-sm font-medium text-left bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">{count.label}</div>
                    <div className="text-xs text-gray-500">
                      {count.description}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900 text-sm mb-1">
              How it works
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Fetches upcoming fixtures from the selected league</li>
              <li>• Analyzes historical data, lineups, and player stats</li>
              <li>• Uses AI (GPT-4) to calculate accurate predictions</li>
              <li>• Each match takes ~18-22 seconds (DEEP_DATA plan)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
