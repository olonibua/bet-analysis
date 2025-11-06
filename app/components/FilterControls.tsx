'use client';

import { ChevronDown } from 'lucide-react';

interface Filters {
  league: string;
  confidence: string;
  dateRange: string;
}

interface FilterControlsProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function FilterControls({ filters, onFiltersChange }: FilterControlsProps) {
  const leagues = [
    { value: 'all', label: 'All Leagues' },
    { value: 'Premier League', label: 'Premier League' },
    { value: 'La Liga', label: 'La Liga' },
    { value: 'Bundesliga', label: 'Bundesliga' },
    { value: 'Serie A', label: 'Serie A' }
  ];

  const confidenceLevels = [
    { value: 'all', label: 'All Confidence Levels' },
    { value: 'High', label: 'High Confidence (80%+)' },
    { value: 'Medium', label: 'Medium Confidence (65%+)' }
  ];

  const dateRanges = [
    { value: '1d', label: 'Today' },
    { value: '3d', label: 'Next 3 Days' },
    { value: '7d', label: 'Next 7 Days' },
    { value: '14d', label: 'Next 2 Weeks' }
  ];

  const updateFilter = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filter Events</h3>
        <button
          onClick={() => onFiltersChange({ league: 'all', confidence: 'all', dateRange: '7d' })}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* League Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            League
          </label>
          <div className="relative">
            <select
              value={filters.league}
              onChange={(e) => updateFilter('league', e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md appearance-none bg-white"
            >
              {leagues.map((league) => (
                <option key={league.value} value={league.value}>
                  {league.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Confidence Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confidence Level
          </label>
          <div className="relative">
            <select
              value={filters.confidence}
              onChange={(e) => updateFilter('confidence', e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md appearance-none bg-white"
            >
              {confidenceLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Range
          </label>
          <div className="relative">
            <select
              value={filters.dateRange}
              onChange={(e) => updateFilter('dateRange', e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md appearance-none bg-white"
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          {filters.league !== 'all' && (
            <FilterTag
              label={`League: ${filters.league}`}
              onRemove={() => updateFilter('league', 'all')}
            />
          )}
          {filters.confidence !== 'all' && (
            <FilterTag
              label={`Confidence: ${filters.confidence}`}
              onRemove={() => updateFilter('confidence', 'all')}
            />
          )}
          {filters.dateRange !== '7d' && (
            <FilterTag
              label={`Range: ${dateRanges.find(r => r.value === filters.dateRange)?.label}`}
              onRemove={() => updateFilter('dateRange', '7d')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

function FilterTag({ label, onRemove }: FilterTagProps) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
      {label}
      <button
        onClick={onRemove}
        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 text-blue-600 hover:text-blue-800"
      >
        ×
      </button>
    </span>
  );
}