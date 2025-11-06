'use client';

import { EventWithProbabilities } from '@/lib/types';
import { TrendingUp, Target, Calendar, Award } from 'lucide-react';

interface StatsOverviewProps {
  events: EventWithProbabilities[];
}

export function StatsOverview({ events }: StatsOverviewProps) {
  // Calculate statistics
  const totalEvents = events.length;
  const highConfidenceCount = events.filter(event =>
    event.topProbabilities.some(prob => prob.confidence === 'High')
  ).length;
  const mediumConfidenceCount = events.filter(event =>
    event.topProbabilities.some(prob => prob.confidence === 'Medium')
  ).length;

  const avgHighestProbability = events.length > 0
    ? events.reduce((sum, event) => {
        const maxProb = Math.max(...event.topProbabilities.map(p => p.probability));
        return sum + maxProb;
      }, 0) / events.length
    : 0;

  const stats = [
    {
      label: 'Total Events',
      value: totalEvents,
      icon: Calendar,
      description: 'Upcoming fixtures analyzed'
    },
    {
      label: 'High Confidence',
      value: highConfidenceCount,
      icon: Award,
      description: 'Events with 80%+ predictions'
    },
    {
      label: 'Medium Confidence',
      value: mediumConfidenceCount,
      icon: Target,
      description: 'Events with 65-79% predictions'
    },
    {
      label: 'Avg. Probability',
      value: `${Math.round(avgHighestProbability * 100)}%`,
      icon: TrendingUp,
      description: 'Average top prediction'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  description: string;
}

function StatCard({ label, value, icon: Icon, description }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <Icon className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-2">
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
          </div>

          <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
}