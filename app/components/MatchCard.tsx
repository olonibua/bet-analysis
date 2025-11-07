'use client';

import { EventWithProbabilities, Probability } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';
import { MatchChat } from './MatchChat';

interface MatchCardProps {
  match: EventWithProbabilities;
}

interface PredictionSectionProps {
  title: string;
  probabilities: Probability[];
}

function PredictionSection({ title, probabilities }: PredictionSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (probabilities.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 space-y-3 bg-white">
          {probabilities.map((prob) => {
            const percentage = Math.round(prob.probability * 100);
            return (
              <div key={prob.$id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {prob.subMarket}
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
      )}
    </div>
  );
}

export function MatchCard({ match }: MatchCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Find the highest probability prediction
  const topPrediction = match.topProbabilities[0];
  const hasProb = match.topProbabilities.length > 0;

  // Calculate confidence level
  const maxProb = hasProb ? Math.max(...match.topProbabilities.map(p => p.probability)) : 0;
  const isHighConfidence = maxProb >= 0.75;
  const isMediumConfidence = maxProb >= 0.60;

  // Check if match is within 1 hour of kickoff
  const matchTime = new Date(match.datetime);
  const now = new Date();
  const hoursDiff = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLineupAvailable = hoursDiff <= 1 && hoursDiff >= -0.25; // 1 hour before to 15 min after kickoff

  const handleUpdateWithLineup = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/update-lineup?eventId=${match.$id}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Reload the page to show updated predictions
        window.location.reload();
      } else {
        alert('Lineup not available yet. Please try again closer to kickoff.');
      }
    } catch (error) {
      console.error('Error updating with lineup:', error);
      alert('Failed to update predictions. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {format(new Date(match.datetime), 'MMM dd, yyyy • HH:mm')}
          </div>

          {/* Update with Lineup Button - Only show if within 1 hour */}
          {isLineupAvailable && (
            <button
              onClick={handleUpdateWithLineup}
              disabled={isUpdating}
              className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update with Lineup
                </>
              )}
            </button>
          )}
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

        {/* Predictions - Grouped by Category */}
        {hasProb ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Predictions
            </h4>
            <PredictionSection
              title="Match Result"
              probabilities={match.topProbabilities.filter(p => p.market === 'Match Result')}
            />
            <PredictionSection
              title="Goals"
              probabilities={match.topProbabilities.filter(p => p.market === 'Over/Under 2.5')}
            />
            <PredictionSection
              title="Both Teams to Score"
              probabilities={match.topProbabilities.filter(p => p.market === 'Both Teams to Score')}
            />
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

      {/* AI Chat */}
      <MatchChat
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        eventId={match.$id}
      />

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>📍 {match.venue || 'Venue TBD'}</span>
          <span>Updated {format(new Date(match.$updatedAt), 'HH:mm')}</span>
        </div>
      </div>
    </div>
  );
}
