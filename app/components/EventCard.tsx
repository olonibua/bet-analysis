'use client';

import { EventWithProbabilities, Probability } from '@/lib/types';
import { format } from 'date-fns';

interface EventCardProps {
  event: EventWithProbabilities;
}

interface GroupedMarket {
  market: string;
  probabilities: Probability[];
}

// Group probabilities by market for better organization
function groupProbabilitiesByMarket(probabilities: Probability[]): GroupedMarket[] {
  const grouped = probabilities.reduce((acc: Record<string, Probability[]>, prob) => {
    if (!acc[prob.market]) {
      acc[prob.market] = [];
    }
    acc[prob.market].push(prob);
    return acc;
  }, {});

  return Object.keys(grouped).map(market => ({
    market,
    probabilities: grouped[market].sort((a, b) => b.probability - a.probability)
  }));
}

export function EventCard({ event }: EventCardProps) {
  // Get the highest probability for styling (default to 0 if no probabilities)
  const maxProbability = event.topProbabilities.length > 0
    ? Math.max(...event.topProbabilities.map(p => p.probability))
    : 0;
  const isHighConfidence = maxProbability >= 0.8;
  const isMediumConfidence = maxProbability >= 0.65;

  return (
    <div className={`bg-white rounded-lg shadow-md border-l-4 hover:shadow-lg transition-shadow ${
      isHighConfidence ? 'border-green-500' : isMediumConfidence ? 'border-yellow-500' : 'border-gray-300'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{event.league}</span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isHighConfidence ? 'bg-green-100 text-green-800' :
            isMediumConfidence ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {isHighConfidence ? 'High' : isMediumConfidence ? 'Medium' : 'Low'} Confidence
          </div>
        </div>

        {/* Teams */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4">
            <div className="text-right">
              <p className="font-semibold text-gray-900">{event.homeTeam}</p>
              <p className="text-xs text-gray-500">Home</p>
            </div>
            <div className="text-gray-400 font-bold">VS</div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{event.awayTeam}</p>
              <p className="text-xs text-gray-500">Away</p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="mt-3 text-sm text-gray-600">
            <p>{format(new Date(event.datetime), 'MMM dd, yyyy')}</p>
            <p>{format(new Date(event.datetime), 'HH:mm')}</p>
          </div>
        </div>
      </div>

      {/* Probabilities - Organized by Market */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Betting Options</h4>
        {event.topProbabilities.length === 0 ? (
          <p className="text-sm text-gray-500">No predictions available yet</p>
        ) : (
          <div className="space-y-4">
            {/* Group probabilities by market */}
            {groupProbabilitiesByMarket(event.topProbabilities).map((group) => (
              <div key={group.market}>
                <h5 className="text-xs font-semibold text-gray-600 mb-2">{group.market}</h5>
                <div className="space-y-2">
                  {group.probabilities.map((prob) => (
                    <ProbabilityItem key={prob.$id} probability={prob} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Venue: {event.venue || 'TBD'}</span>
          <span>Updated: {format(new Date(event.$updatedAt), 'HH:mm')}</span>
        </div>
      </div>
    </div>
  );
}

interface ProbabilityItemProps {
  probability: Probability;
}

function ProbabilityItem({ probability }: ProbabilityItemProps) {
  const percentage = Math.round(probability.probability * 100);

  const getConfidenceColor = (confidence: Probability['confidence']) => {
    switch (confidence) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressBarColor = (confidence: Probability['confidence']) => {
    switch (confidence) {
      case 'High': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{probability.subMarket}</span>
        <span className={`text-base font-bold ${getConfidenceColor(probability.confidence)}`}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${getProgressBarColor(probability.confidence)}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span className={`px-1.5 py-0.5 rounded ${
          probability.confidence === 'High' ? 'bg-green-100 text-green-700' :
          probability.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {probability.confidence}
        </span>
        <span>{probability.sampleSize} matches</span>
      </div>
    </div>
  );
}