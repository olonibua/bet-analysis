// Core data types for Sports Probability Engine

export interface Event {
  $id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  datetime: string;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  season: string;
  externalId: string; // Reference to external API
  $createdAt: string;
  $updatedAt: string;
}

export interface Match {
  $id: string;
  eventId: string; // Reference to Event
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  league: string;
  statistics: string; // JSON stringified MatchStatistics
  enhancedData?: string; // JSON stringified EnhancedMatchData (Deep Data plan)
  hasEnhancedData?: boolean; // Flag to indicate enhanced data availability
  enhancedDataFetchedAt?: string; // Timestamp of last enhanced data fetch
  externalId?: string; // External match ID for API reference
  $createdAt: string;
  $updatedAt: string;
}

export interface MatchStatistics {
  homeCorners: number;
  awayCorners: number;
  totalCorners: number;
  homeYellowCards: number;
  awayYellowCards: number;
  totalYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  totalRedCards: number;
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  halfTimeHomeScore: number;
  halfTimeAwayScore: number;
}

export interface Probability {
  $id: string;
  eventId: string; // Reference to Event
  market: string; // 'Corners', 'Main', 'Over', 'Half', 'Specials', 'Players'
  subMarket: string; // 'Over 2.5 Goals', '1X2', 'BTTS', etc.
  probability: number; // 0-1 (percentage as decimal)
  confidence: 'High' | 'Medium' | 'Low';
  sampleSize: number; // Number of historical matches used
  lastCalculated: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface Team {
  $id: string;
  name: string;
  league: string;
  season: string;
  externalId: string;
  $createdAt: string;
  $updatedAt: string;
}

// Helper types for calculations
export interface SubMarketAnalysis {
  market: string;
  subMarket: string;
  occurrences: number;
  totalMatches: number;
  probability: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface EventWithProbabilities extends Event {
  probabilities: Probability[];
  topProbabilities: Probability[]; // Top 3 highest probability sub-markets
}

// API response types
export interface FootballDataFixture {
  id: number;
  season: {
    id: number;
    startDate: string;
    endDate: string;
  };
  utcDate: string;
  status: string;
  homeTeam: {
    id: number;
    name: string;
  };
  awayTeam: {
    id: number;
    name: string;
  };
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
    halfTime: {
      home: number | null;
      away: number | null;
    };
  };
  competition: {
    id: number;
    name: string;
  };
}

export interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: {
    id: number;
    name: string;
  };
  awayTeam: {
    id: number;
    name: string;
  };
  score: {
    fullTime: {
      home: number;
      away: number;
    };
    halfTime: {
      home: number;
      away: number;
    };
  };
  competition: {
    id: number;
    name: string;
  };
}

// Markets and Sub-Markets configuration
// Only markets available with ML Pack Light (goal-based data)
export const MARKETS = {
  MAIN: 'Match Result',
  OVER_UNDER: 'Total Goals',
  BOTH_TEAMS: 'Both Teams to Score'
} as const;

export const SUB_MARKETS = {
  // Main markets (1X2)
  HOME_WIN: 'Home Win',
  DRAW: 'Draw',
  AWAY_WIN: 'Away Win',

  // Over/Under goals
  OVER_1_5: 'Over 1.5 Goals',
  UNDER_1_5: 'Under 1.5 Goals',
  OVER_2_5: 'Over 2.5 Goals',
  UNDER_2_5: 'Under 2.5 Goals',
  OVER_3_5: 'Over 3.5 Goals',
  UNDER_3_5: 'Under 3.5 Goals',

  // Both teams to score
  BTTS_YES: 'Both Teams to Score - Yes',
  BTTS_NO: 'Both Teams to Score - No',
} as const;