import axios from 'axios';
import { FootballDataFixture, FootballDataMatch, Event, Match } from './types';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// Create axios instance with default config
const footballApi = axios.create({
  baseURL: FOOTBALL_DATA_BASE_URL,
  headers: {
    'X-Auth-Token': API_KEY || 'demo-key',
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Rate limiting configuration based on API plan
const RATE_LIMITS = {
  FREE: { callsPerMinute: 10, delayMs: 6100 }, // 6.1 seconds between calls
  FREE_WITH_LIVESCORES: { callsPerMinute: 20, delayMs: 3000 }, // 3 seconds between calls
  ML_PACK_LIGHT: { callsPerMinute: 20, delayMs: 3000 }, // 3 seconds between calls (€29/mo - 10 seasons history)
  DEEP_DATA: { callsPerMinute: 30, delayMs: 2000 }, // 2 seconds between calls (€29/mo - lineups, cards)
  STANDARD: { callsPerMinute: 60, delayMs: 1000 }, // 1 second between calls
  ADVANCED: { callsPerMinute: 100, delayMs: 600 }, // 0.6 seconds between calls
  PRO: { callsPerMinute: 120, delayMs: 500 }, // 0.5 seconds between calls
};

// Detect API plan from environment or default to FREE for safety
const envPlan = process.env.FOOTBALL_DATA_PLAN as keyof typeof RATE_LIMITS | undefined;
let currentRateLimit = envPlan && RATE_LIMITS[envPlan] ? RATE_LIMITS[envPlan] : RATE_LIMITS.FREE;

// Log the plan on initialization
if (envPlan && RATE_LIMITS[envPlan]) {
  console.log(`Using configured API plan: ${envPlan} (${currentRateLimit.callsPerMinute} calls/minute)`);
} else {
  console.log(`Using default API plan: FREE (${currentRateLimit.callsPerMinute} calls/minute)`);
}

// Function to set rate limit based on API plan
export const setApiRateLimit = (plan: keyof typeof RATE_LIMITS) => {
  currentRateLimit = RATE_LIMITS[plan];
  console.log(`API Rate limit set to: ${plan} (${currentRateLimit.callsPerMinute} calls/minute)`);
};

// Function to get current rate limit
export const getCurrentRateLimit = () => currentRateLimit;

// Competition IDs for major leagues
export const COMPETITIONS = {
  PREMIER_LEAGUE: 'PL',
  LA_LIGA: 'PD',
  BUNDESLIGA: 'BL1',
  SERIE_A: 'SA',
  LIGUE_1: 'FL1',
  CHAMPIONS_LEAGUE: 'CL',
  EUROPA_LEAGUE: 'EL',
} as const;

// Get upcoming fixtures for a specific competition
export const getFixtures = async (
  competitionCode: string,
  dateFrom?: string,
  dateTo?: string
): Promise<FootballDataFixture[]> => {
  try {
    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const response = await footballApi.get(`/competitions/${competitionCode}/matches`, {
      params,
    });

    return response.data.matches || [];
  } catch (error) {
    console.error(`Error fetching fixtures for ${competitionCode}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
    throw error;
  }
};

// Get all upcoming fixtures across multiple competitions
export const getAllUpcomingFixtures = async (days: number = 7): Promise<FootballDataFixture[]> => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = futureDate.toISOString().split('T')[0];

  const competitions = Object.values(COMPETITIONS);
  const allFixtures: FootballDataFixture[] = [];

  // Fetch fixtures for each competition
  for (const competition of competitions.slice(0, 3)) { // Limit to top 3 for MVP
    try {
      console.log(`Fetching fixtures for ${competition}...`);
      const fixtures = await getFixtures(competition, dateFrom, dateTo);
      allFixtures.push(...fixtures);

      // Add delay to respect rate limits (configurable based on API plan)
      await new Promise(resolve => setTimeout(resolve, currentRateLimit.delayMs));
    } catch (error) {
      console.error(`Failed to fetch fixtures for ${competition}:`, error);
      continue; // Continue with other competitions even if one fails
    }
  }

  return allFixtures;
};

// Get upcoming fixtures for a single league only
export const getLeagueFixtures = async (
  competitionCode: string,
  days: number = 7
): Promise<FootballDataFixture[]> => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = futureDate.toISOString().split('T')[0];

  try {
    console.log(`Fetching fixtures for ${competitionCode} only...`);
    const fixtures = await getFixtures(competitionCode, dateFrom, dateTo);
    return fixtures;
  } catch (error) {
    console.error(`Failed to fetch fixtures for ${competitionCode}:`, error);
    throw error;
  }
};

// Get historical matches for a specific competition
export const getHistoricalMatches = async (
  competitionCode: string,
  dateFrom: string,
  dateTo: string
): Promise<FootballDataMatch[]> => {
  try {
    const response = await footballApi.get(`/competitions/${competitionCode}/matches`, {
      params: {
        dateFrom,
        dateTo,
        status: 'FINISHED',
      },
    });

    return response.data.matches || [];
  } catch (error) {
    console.error(`Error fetching historical matches for ${competitionCode}:`, error);
    throw error;
  }
};

// Convert Football-data API fixture to our Event type
export const convertFixtureToEvent = (fixture: FootballDataFixture): Omit<Event, '$id' | '$createdAt' | '$updatedAt'> => {
  // Check if the fixture is actually in the future
  const fixtureDate = new Date(fixture.utcDate);
  const now = new Date();
  const isInFuture = fixtureDate > now;

  let status: 'upcoming' | 'live' | 'finished';
  if (isInFuture) {
    status = 'upcoming';
  } else {
    status = fixture.status === 'IN_PLAY' ? 'live' : 'finished';
  }

  // Log only when status conversion is needed for debugging
  if (fixture.status === 'FINISHED' && isInFuture) {
    console.log(`Status corrected: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name} - API: ${fixture.status} → Our: ${status}`);
  }

  return {
    homeTeam: fixture.homeTeam.name,
    awayTeam: fixture.awayTeam.name,
    league: fixture.competition.name,
    datetime: fixture.utcDate,
    venue: '', // Football-data API doesn't always provide venue in free tier
    status,
    season: `${fixture.season.startDate.split('-')[0]}-${fixture.season.endDate.split('-')[0]}`,
    externalId: fixture.id.toString(),
  };
};

// Convert Football-data API match to our Match type
export const convertMatchToMatch = (match: FootballDataMatch): Omit<Match, '$id' | '$createdAt' | '$updatedAt'> => {
  return {
    eventId: '', // This will be set when linking to an event
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeScore: match.score.fullTime.home,
    awayScore: match.score.fullTime.away,
    date: match.utcDate,
    league: match.competition.name,
    externalId: match.id.toString(), // Store external match ID for enhanced data fetching
    hasEnhancedData: false, // Will be updated when enhanced data is fetched
    statistics: JSON.stringify({
      homeCorners: 0, // Will be enhanced with getEnhancedMatchStatistics
      awayCorners: 0,
      totalCorners: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      totalYellowCards: 0,
      homeRedCards: 0,
      awayRedCards: 0,
      totalRedCards: 0,
      homePossession: 0,
      awayPossession: 0,
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      halfTimeHomeScore: match.score.halfTime.home,
      halfTimeAwayScore: match.score.halfTime.away,
    }),
  };
};

// Get enhanced match statistics using Deep Data plan features
export const getEnhancedMatchStatistics = async (matchId: number): Promise<any> => {
  try {
    // Fetch match events to get goals, cards, etc.
    const events = await getMatchEvents(matchId);

    // Initialize statistics
    const stats = {
      homeYellowCards: 0,
      awayYellowCards: 0,
      totalYellowCards: 0,
      homeRedCards: 0,
      awayRedCards: 0,
      totalRedCards: 0,
      homeGoals: 0,
      awayGoals: 0,
      homeSubstitutions: 0,
      awaySubstitutions: 0,
      goalScorers: [] as Array<{ player: string; team: string; minute: number }>,
      yellowCards: [] as Array<{ player: string; team: string; minute: number }>,
      redCards: [] as Array<{ player: string; team: string; minute: number }>,
      substitutions: [] as Array<{ playerIn: string; playerOut: string; team: string; minute: number }>,
    };

    // Process events
    events.forEach(event => {
      const isHomeTeam = event.team.id === event.team.id; // Will need actual home team ID

      switch (event.type) {
        case 'YELLOW_CARD':
          stats.totalYellowCards++;
          if (isHomeTeam) stats.homeYellowCards++;
          else stats.awayYellowCards++;
          stats.yellowCards.push({
            player: event.player.name,
            team: event.team.name,
            minute: event.minute,
          });
          break;

        case 'RED_CARD':
          stats.totalRedCards++;
          if (isHomeTeam) stats.homeRedCards++;
          else stats.awayRedCards++;
          stats.redCards.push({
            player: event.player.name,
            team: event.team.name,
            minute: event.minute,
          });
          break;

        case 'GOAL':
          if (isHomeTeam) stats.homeGoals++;
          else stats.awayGoals++;
          stats.goalScorers.push({
            player: event.player.name,
            team: event.team.name,
            minute: event.minute,
          });
          break;

        case 'SUBSTITUTION':
          if (isHomeTeam) stats.homeSubstitutions++;
          else stats.awaySubstitutions++;
          break;
      }
    });

    return stats;
  } catch (error) {
    console.error(`Error fetching enhanced statistics for match ${matchId}:`, error);
    return null;
  }
};

// Get team's recent matches
export const getTeamMatches = async (
  teamId: number,
  status: 'SCHEDULED' | 'FINISHED' | 'LIVE' = 'FINISHED',
  limit: number = 20
): Promise<FootballDataMatch[]> => {
  try {
    const response = await footballApi.get(`/teams/${teamId}/matches`, {
      params: {
        status,
        limit,
      },
    });

    return response.data.matches || [];
  } catch (error) {
    console.error(`Error fetching team ${teamId} matches:`, error);
    throw error;
  }
};

// Utility function to get competition info
export const getCompetitionInfo = async (competitionCode: string) => {
  try {
    const response = await footballApi.get(`/competitions/${competitionCode}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching competition ${competitionCode} info:`, error);
    throw error;
  }
};

// Enhanced data types for paid plans
export interface MatchLineup {
  homeTeam: {
    id: number;
    name: string;
    lineup: Player[];
  };
  awayTeam: {
    id: number;
    name: string;
    lineup: Player[];
  };
}

export interface Player {
  id: number;
  name: string;
  position: string;
  shirtNumber: number;
}

export interface MatchEvent {
  id: number;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'PENALTY';
  minute: number;
  player: {
    id: number;
    name: string;
  };
  team: {
    id: number;
    name: string;
  };
}

// Get match lineups (paid plan feature)
export const getMatchLineup = async (matchId: number): Promise<MatchLineup | null> => {
  try {
    const response = await footballApi.get(`/matches/${matchId}/lineups`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching lineup for match ${matchId}:`, error);
    return null;
  }
};

// Get match events (paid plan feature)
export const getMatchEvents = async (matchId: number): Promise<MatchEvent[]> => {
  try {
    const response = await footballApi.get(`/matches/${matchId}/events`);
    return response.data.events || [];
  } catch (error) {
    console.error(`Error fetching events for match ${matchId}:`, error);
    return [];
  }
};

// Get team squad (paid plan feature)
export const getTeamSquad = async (teamId: number): Promise<Player[]> => {
  try {
    const response = await footballApi.get(`/teams/${teamId}/squad`);
    return response.data.squad || [];
  } catch (error) {
    console.error(`Error fetching squad for team ${teamId}:`, error);
    return [];
  }
};

// Test API connection and detect plan
export const testApiConnection = async (): Promise<{ success: boolean; plan?: string; details?: any }> => {
  try {
    const response = await footballApi.get('/competitions');
    console.log('Football-data API connection successful');
    console.log(`Available competitions: ${response.data.competitions?.length || 0}`);

    // Check if plan is already configured via environment
    let detectedPlan = envPlan && RATE_LIMITS[envPlan] ? envPlan : 'FREE';

    // Only auto-detect if not configured in environment
    if (!envPlan || !RATE_LIMITS[envPlan]) {
      console.log('No plan configured in environment, attempting auto-detection...');

      // Test for paid plan features
      try {
        // Try to access a feature that's only available in paid plans
        const testResponse = await footballApi.get('/competitions/PL/matches?limit=1');
        if (testResponse.data.matches && testResponse.data.matches.length > 0) {
          const matchId = testResponse.data.matches[0].id;

          // Try to get lineup (paid feature)
          try {
            await footballApi.get(`/matches/${matchId}/lineups`);
            detectedPlan = 'STANDARD'; // Has lineup access
          } catch {
            // Try to get events (paid feature)
            try {
              await footballApi.get(`/matches/${matchId}/events`);
              detectedPlan = 'DEEP_DATA'; // Has events access
            } catch {
              detectedPlan = 'FREE'; // No paid features
            }
          }
        }
      } catch {
        detectedPlan = 'FREE';
      }

      // Set rate limit based on detected plan
      setApiRateLimit(detectedPlan as keyof typeof RATE_LIMITS);
    } else {
      console.log(`Using environment-configured plan: ${detectedPlan}`);
    }

    return {
      success: true,
      plan: detectedPlan,
      details: {
        competitions: response.data.competitions?.length || 0,
        rateLimit: currentRateLimit
      }
    };
  } catch (error) {
    console.error('Football-data API connection failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
    return {
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};