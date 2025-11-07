'use client';

interface ProgressTrackerProps {
  current: number;
  total: number;
  currentMatch: string;
  stage: string;
}

export function ProgressTracker({
  current,
  total,
  currentMatch,
  stage,
}: ProgressTrackerProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analyzing Matches
        </h2>
        <p className="text-gray-600">
          Please wait while we calculate probabilities using AI
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Match {current} of {total}
          </span>
          <span className="text-sm font-medium text-blue-600">
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Current Stage */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900">{stage}</p>
            <p className="text-sm text-blue-700 mt-1">{currentMatch}</p>
          </div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="grid grid-cols-4 gap-3">
        <StageIndicator
          label="Fetch Fixture"
          active={stage.includes('Fetching')}
          complete={current > 0 || stage.includes('Historical')}
        />
        <StageIndicator
          label="Historical Data"
          active={stage.includes('Historical')}
          complete={stage.includes('Analyzing') || stage.includes('Saving')}
        />
        <StageIndicator
          label="AI Analysis"
          active={stage.includes('Analyzing')}
          complete={stage.includes('Saving')}
        />
        <StageIndicator
          label="Save Results"
          active={stage.includes('Saving')}
          complete={false}
        />
      </div>

      {/* Estimated Time */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Estimated time remaining:{' '}
          <span className="font-semibold text-gray-900">
            {Math.max(0, (total - current) * 20)} seconds
          </span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Each match takes approximately 18-22 seconds to analyze (DEEP_DATA plan)
        </p>
      </div>
    </div>
  );
}

interface StageIndicatorProps {
  label: string;
  active: boolean;
  complete: boolean;
}

function StageIndicator({ label, active, complete }: StageIndicatorProps) {
  return (
    <div
      className={`
        text-center p-3 rounded-lg border-2 transition-all
        ${
          complete
            ? 'bg-green-50 border-green-500'
            : active
            ? 'bg-blue-50 border-blue-500'
            : 'bg-gray-50 border-gray-200'
        }
      `}
    >
      <div className="mb-1">
        {complete ? (
          <svg
            className="w-5 h-5 text-green-600 mx-auto"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ) : active ? (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        ) : (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full mx-auto"></div>
        )}
      </div>
      <p
        className={`
        text-xs font-medium
        ${complete ? 'text-green-700' : active ? 'text-blue-700' : 'text-gray-500'}
      `}
      >
        {label}
      </p>
    </div>
  );
}
