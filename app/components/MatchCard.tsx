'use client';

import { EventWithProbabilities } from '@/lib/types';
import { format } from 'date-fns';

interface MatchCardProps {
  match: EventWithProbabilities;
}

export function MatchCard({ match }: MatchCardProps) {
  // Find the highest probability prediction
  const topPrediction = match.topProbabilities[0];
  const hasProb = match.topProbabilities.length > 0;

  // Calculate confidence level
  const maxProb = hasProb ? Math.max(...match.topProbabilities.map(p => p.probability)) : 0;
  const isHighConfidence = maxProb >= 0.75;
  const isMediumConfidence = maxProb >= 0.60;

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border-2 hover:shadow-lg transition-all
        ${isHighConfidence ? 'border-green-400' : isMediumConfidence ? 'border-yellow-400' : 'border-gray-200'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {match.league}
          </span>
          {hasProb && (
            <span
              className={`
                px-2.5 py-1 rounded-full text-xs font-bold
                ${isHighConfidence ? 'bg-green-100 text-green-800' :
                  isMediumConfidence ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-700'}
              `}
            >
              {isHighConfidence ? 'HIGH' : isMediumConfidence ? 'MEDIUM' : 'LOW'}
            </span>
          )}
        </div>

        {/* Match Date/Time */}
        <div className="text-xs text-gray-500">
          {format(new Date(match.datetime), 'MMM dd, yyyy • HH:mm')}
        </div>
      </div>

      {/* Teams */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 text-center">
            <p className="font-bold text-lg text-gray-900 mb-1">
              {match.homeTeam}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Home</p>
          </div>

          <div className="px-4">
            <div className="text-2xl font-bold text-gray-400">VS</div>
          </div>

          <div className="flex-1 text-center">
            <p className="font-bold text-lg text-gray-900 mb-1">
              {match.awayTeam}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Away</p>
          </div>
        </div>

        {/* Predictions */}
        {hasProb ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Top Predictions
            </h4>
            {match.topProbabilities.slice(0, 5).map((prob) => {
              const percentage = Math.round(prob.probability * 100);
              return (
                <div key={prob.$id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {prob.market === 'Match Result' ? prob.subMarket : `${prob.market} - ${prob.subMarket}`}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`
                        h-full rounded-full transition-all
                        ${percentage >= 75 ? 'bg-green-500' :
                          percentage >= 60 ? 'bg-yellow-500' :
                          'bg-gray-400'}
                      `}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Based on {prob.sampleSize} matches
                    </span>
                    <span
                      className={`
                        font-medium
                        ${prob.confidence === 'High' ? 'text-green-600' :
                          prob.confidence === 'Medium' ? 'text-yellow-600' :
                          'text-gray-600'}
                      `}
                    >
                      {prob.confidence}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-gray-500">No predictions available</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>📍 {match.venue || 'Venue TBD'}</span>
          <span>Updated {format(new Date(match.$updatedAt), 'HH:mm')}</span>
        </div>
      </div>
    </div>
  );
}
