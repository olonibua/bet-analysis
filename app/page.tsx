'use client';

import { useEffect, useState } from 'react';
import { EventCard } from './components/EventCard';
import { FilterControls } from './components/FilterControls';
import { StatsOverview } from './components/StatsOverview';
import { LeagueSelector } from './components/LeagueSelector';
import { EventWithProbabilities } from '@/lib/types';
import { getEventsWithProbabilities } from '@/lib/database';

export default function Dashboard() {
  const [events, setEvents] = useState<EventWithProbabilities[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithProbabilities[]>([]);
  const [loading, setLoading] = useState(false); // Changed: Don't load on startup
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [filters, setFilters] = useState({
    league: 'all',
    confidence: 'all',
    dateRange: '7d'
  });

  // Check for existing data on component mount
  useEffect(() => {
    checkExistingData();
  }, []);

  // Filter events when filters change
  useEffect(() => {
    filterEvents();
  }, [events, filters]);

  const checkExistingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if there's any existing data
      const realEvents = await getEventsWithProbabilities(10);

      if (realEvents.length > 0) {
        setEvents(realEvents);
        setHasData(true);
      } else {
        setHasData(false);
      }
    } catch (err) {
      console.error('Error checking existing data:', err);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load real events from database
      const realEvents = await getEventsWithProbabilities(50);
      setEvents(realEvents);
      setHasData(realEvents.length > 0);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueSelect = async (league: string) => {
    try {
      setLeagueLoading(true);
      setSelectedLeague(league);
      setError(null);

      // Call league-specific sync API
      const response = await fetch(`/api/sync?action=league&league=${league}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        // Reload events after successful sync
        await loadEvents();
        setHasData(true);
      } else {
        setError(`Failed to load ${league} data. Please try again.`);
      }
    } catch (err) {
      console.error('Error loading league data:', err);
      setError('Failed to load league data. Please try again.');
    } finally {
      setLeagueLoading(false);
    }
  };

  const handleDataSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      // If a league is selected, sync only that league
      // Otherwise, sync all leagues
      const endpoint = selectedLeague
        ? `/api/sync?action=league&league=${selectedLeague}`
        : '/api/sync?action=full';

      const response = await fetch(endpoint, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        // Reload events after successful sync
        await loadEvents();
        setHasData(true);
      } else {
        setError('Data sync failed. Please check your API configuration.');
      }
    } catch (err) {
      console.error('Error syncing data:', err);
      setError('Failed to sync data. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Filter out past events (only show upcoming)
    const now = new Date();
    filtered = filtered.filter(event => new Date(event.datetime) > now);

    // Filter by league
    if (filters.league !== 'all') {
      filtered = filtered.filter(event => event.league === filters.league);
    }

    // Filter by confidence level
    if (filters.confidence !== 'all') {
      filtered = filtered.filter(event =>
        event.topProbabilities.some(prob => prob.confidence === filters.confidence)
      );
    }

    // Sort by date (soonest first)
    filtered.sort((a, b) => {
      return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
    });

    setFilteredEvents(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking for existing data...</p>
        </div>
      </div>
    );
  }

  // Show league selector if no data exists
  if (!hasData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Sports Probability Engine!</h1>
            <p className="text-gray-600 text-lg">Select a league to start loading live football data and probability predictions.</p>
          </div>

          {error && (
            <div className="mb-6 max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <LeagueSelector
            onLeagueSelect={handleLeagueSelect}
            loading={leagueLoading}
            selectedLeague={selectedLeague}
          />

          {/* Sync Data Option */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {selectedLeague ? 'Sync Selected League Data' : 'Alternative: Load All Leagues'}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedLeague
                  ? 'Fetch fixtures and historical matches for the selected league to calculate probabilities.'
                  : 'Load data for multiple leagues at once (slower, may hit rate limits).'}
              </p>
              <button
                onClick={handleDataSync}
                disabled={syncing || leagueLoading}
                className={`w-full px-6 py-3 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                  selectedLeague ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {selectedLeague ? 'Syncing League Data...' : 'Loading All Leagues...'}
                  </>
                ) : (
                  selectedLeague ? 'Sync Data' : 'Load All Leagues (Not Recommended)'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={loadEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={handleDataSync}
              disabled={syncing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sports Probability Engine</h1>
              <p className="text-sm text-gray-600">Data-driven betting intelligence platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <button
                onClick={loadEvents}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Refresh
              </button>
              <button
                onClick={handleDataSync}
                disabled={syncing}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Data'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <StatsOverview events={events} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* League Selector */}
        <LeagueSelector
          onLeagueSelect={handleLeagueSelect}
          loading={leagueLoading}
          selectedLeague={selectedLeague}
        />

        {/* Filter Controls */}
        <FilterControls filters={filters} onFiltersChange={setFilters} />

        {/* Events Grid */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Upcoming Events ({filteredEvents.length})
            </h2>
            <p className="text-sm text-gray-600">
              Showing events with 65%+ confidence predictions
            </p>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No events match your current filters.</p>
              <button
                onClick={() => setFilters({ league: 'all', confidence: 'all', dateRange: '7d' })}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.$id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Probabilities calculated using historical match data and statistical analysis.</p>
          <p>For educational purposes only. Always gamble responsibly.</p>
        </div>
      </main>
    </div>
  );
}