import { getHistoricalMatches, getTeamMatches, createProbability, deleteProbabilitiesByEvent } from './database';
import { Match, Event, Probability, SubMarketAnalysis, MARKETS, SUB_MARKETS } from './types';
import { getMatchEvents, getMatchLineup, getTeamSquad } from './football-api';

// Configuration for probability calculations
const PROBABILITY_CONFIG = {
  MIN_SAMPLE_SIZE: 5,          // Minimum matches needed for calculation
  HIGH_CONFIDENCE_THRESHOLD: 0.8,  // 80%+ = High confidence
  MEDIUM_CONFIDENCE_THRESHOLD: 0.65, // 65%+ = Medium confidence
  RECENT_MATCH_WEIGHT: 2,      // Weight for recent matches
  HOME_AWAY_FACTOR: 0.05,      // Home advantage factor
  
  // Enhanced features for paid plans
  USE_ENHANCED_DATA: true,     // Use lineups, events, and detailed stats
  INJURY_IMPACT_FACTOR: 0.1,   // Impact of key player injuries
  FORM_WEIGHT_RECENT: 0.4,     // Weight for recent form (last 5 matches)
  FORM_WEIGHT_OVERALL: 0.6,    // Weight for overall season form
};

// Main function to calculate probabilities for an event
export const calculateEventProbabilities = async (event: Event): Promise<Probability[]> => {
  console.log(`Calculating probabilities for: ${event.homeTeam} vs ${event.awayTeam}`);

  try {
    // Clear existing probabilities for this event
    await deleteProbabilitiesByEvent(event.$id);

    // Get historical data for both teams
    const homeTeamMatches = await getTeamMatches(event.homeTeam, 20);
    const awayTeamMatches = await getTeamMatches(event.awayTeam, 20);
    const headToHeadMatches = await getHistoricalMatches(event.homeTeam, event.awayTeam, 10);

    // Calculate probabilities for each sub-market
    let probabilities: Omit<Probability, '$id' | '$createdAt' | '$updatedAt'>[] = [];

    // Always use enhanced calculation for better accuracy
    console.log('Calculating probabilities for all available markets');
    probabilities = await calculateEnhancedProbabilities(
      event,
      homeTeamMatches,
      awayTeamMatches
    );

    // Store probabilities in database
    const createdProbabilities = [];
    for (const prob of probabilities) {
      try {
        const created = await createProbability(prob);
        createdProbabilities.push(created);
      } catch (error) {
        console.error('Error storing probability:', error);
      }
    }

    console.log(`Created ${createdProbabilities.length} probabilities for event ${event.$id}`);
    return createdProbabilities as Probability[];

  } catch (error) {
    console.error('Error calculating event probabilities:', error);
    throw error;
  }
};

// Calculate 1X2 (Home Win / Draw / Away Win) probabilities
const calculateMainMarketProbabilities = (
  event: Event,
  homeMatches: Match[],
  awayMatches: Match[],
  headToHead: Match[]
): Omit<Probability, '$id' | '$createdAt' | '$updatedAt'>[] => {

  const homeWins = homeMatches.filter(m =>
    (m.homeTeam === event.homeTeam && m.homeScore > m.awayScore) ||
    (m.awayTeam === event.homeTeam && m.awayScore > m.homeScore)
  ).length;

  const homeDraws = homeMatches.filter(m => m.homeScore === m.awayScore).length;

  const awayWins = awayMatches.filter(m =>
    (m.homeTeam === event.awayTeam && m.homeScore > m.awayScore) ||
    (m.awayTeam === event.awayTeam && m.awayScore > m.homeScore)
  ).length;

  const awayDraws = awayMatches.filter(m => m.homeScore === m.awayScore).length;

  const totalHomeMatches = homeMatches.length;
  const totalAwayMatches = awayMatches.length;
  const totalMatches = Math.max(totalHomeMatches, totalAwayMatches, PROBABILITY_CONFIG.MIN_SAMPLE_SIZE);

  // Calculate basic probabilities
  const homeWinProb = totalHomeMatches > 0 ? homeWins / totalHomeMatches : 0.33;
  const awayWinProb = totalAwayMatches > 0 ? awayWins / totalAwayMatches : 0.33;
  const drawProb = totalMatches > 0 ? (homeDraws + awayDraws) / totalMatches : 0.34;

  // Apply home advantage
  const adjustedHomeWinProb = Math.min(0.9, homeWinProb + PROBABILITY_CONFIG.HOME_AWAY_FACTOR);
  const adjustedAwayWinProb = Math.max(0.1, awayWinProb - PROBABILITY_CONFIG.HOME_AWAY_FACTOR);

  // Normalize probabilities
  const total = adjustedHomeWinProb + drawProb + adjustedAwayWinProb;
  const normalizedHomeWin = adjustedHomeWinProb / total;
  const normalizedDraw = drawProb / total;
  const normalizedAwayWin = adjustedAwayWinProb / total;

  return [
    {
      eventId: event.$id,
      market: MARKETS.MAIN,
      subMarket: SUB_MARKETS.HOME_WIN,
      probability: normalizedHomeWin,
      confidence: getConfidenceLevel(normalizedHomeWin, totalHomeMatches),
      sampleSize: totalHomeMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.MAIN,
      subMarket: SUB_MARKETS.DRAW,
      probability: normalizedDraw,
      confidence: getConfidenceLevel(normalizedDraw, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.MAIN,
      subMarket: SUB_MARKETS.AWAY_WIN,
      probability: normalizedAwayWin,
      confidence: getConfidenceLevel(normalizedAwayWin, totalAwayMatches),
      sampleSize: totalAwayMatches,
      lastCalculated: new Date().toISOString(),
    }
  ];
};

// Calculate Over/Under Goals probabilities
const calculateOverUnderProbabilities = (
  event: Event,
  homeMatches: Match[],
  awayMatches: Match[],
  headToHead: Match[]
): Omit<Probability, '$id' | '$createdAt' | '$updatedAt'>[] => {

  const allMatches = [...homeMatches, ...awayMatches];
  const totalMatches = allMatches.length;

  if (totalMatches < PROBABILITY_CONFIG.MIN_SAMPLE_SIZE) {
    return [];
  }

  // Calculate over/under statistics
  const over1_5 = allMatches.filter(m => (m.homeScore + m.awayScore) > 1.5).length;
  const over2_5 = allMatches.filter(m => (m.homeScore + m.awayScore) > 2.5).length;
  const over3_5 = allMatches.filter(m => (m.homeScore + m.awayScore) > 3.5).length;

  const over1_5Prob = over1_5 / totalMatches;
  const over2_5Prob = over2_5 / totalMatches;
  const over3_5Prob = over3_5 / totalMatches;

  return [
    {
      eventId: event.$id,
      market: MARKETS.OVER_UNDER,
      subMarket: SUB_MARKETS.OVER_1_5,
      probability: over1_5Prob,
      confidence: getConfidenceLevel(over1_5Prob, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.OVER_UNDER,
      subMarket: SUB_MARKETS.UNDER_1_5,
      probability: 1 - over1_5Prob,
      confidence: getConfidenceLevel(1 - over1_5Prob, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.OVER_UNDER,
      subMarket: SUB_MARKETS.OVER_2_5,
      probability: over2_5Prob,
      confidence: getConfidenceLevel(over2_5Prob, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.OVER_UNDER,
      subMarket: SUB_MARKETS.UNDER_2_5,
      probability: 1 - over2_5Prob,
      confidence: getConfidenceLevel(1 - over2_5Prob, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.OVER_UNDER,
      subMarket: SUB_MARKETS.OVER_3_5,
      probability: over3_5Prob,
      confidence: getConfidenceLevel(over3_5Prob, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.OVER_UNDER,
      subMarket: SUB_MARKETS.UNDER_3_5,
      probability: 1 - over3_5Prob,
      confidence: getConfidenceLevel(1 - over3_5Prob, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    }
  ];
};

// Calculate Both Teams to Score probabilities
const calculateBTTSProbabilities = (
  event: Event,
  homeMatches: Match[],
  awayMatches: Match[],
  headToHead: Match[]
): Omit<Probability, '$id' | '$createdAt' | '$updatedAt'>[] => {

  const allMatches = [...homeMatches, ...awayMatches];
  const totalMatches = allMatches.length;

  if (totalMatches < PROBABILITY_CONFIG.MIN_SAMPLE_SIZE) {
    return [];
  }

  const bttsYes = allMatches.filter(m => m.homeScore > 0 && m.awayScore > 0).length;
  const bttsYesProb = bttsYes / totalMatches;

  return [
    {
      eventId: event.$id,
      market: MARKETS.BOTH_TEAMS,
      subMarket: SUB_MARKETS.BTTS_YES,
      probability: bttsYesProb,
      confidence: getConfidenceLevel(bttsYesProb, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.BOTH_TEAMS,
      subMarket: SUB_MARKETS.BTTS_NO,
      probability: 1 - bttsYesProb,
      confidence: getConfidenceLevel(1 - bttsYesProb, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    }
  ];
};

// Determine confidence level based on probability and sample size
const getConfidenceLevel = (probability: number, sampleSize: number): 'High' | 'Medium' | 'Low' => {
  if (sampleSize < PROBABILITY_CONFIG.MIN_SAMPLE_SIZE) {
    return 'Low';
  }

  if (probability >= PROBABILITY_CONFIG.HIGH_CONFIDENCE_THRESHOLD && sampleSize >= 15) {
    return 'High';
  }

  if (probability >= PROBABILITY_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD && sampleSize >= 10) {
    return 'Medium';
  }

  return 'Low';
};

// Batch calculate probabilities for multiple events
export const calculateBatchProbabilities = async (events: Event[]): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
}> => {
  console.log(`Starting batch probability calculation for ${events.length} events`);

  let processed = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      await calculateEventProbabilities(event);
      processed++;
      console.log(`Processed ${processed}/${events.length}: ${event.homeTeam} vs ${event.awayTeam}`);

      // Add small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      const errorMsg = `Failed to calculate probabilities for ${event.homeTeam} vs ${event.awayTeam}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  const success = errors.length === 0;
  console.log(`Batch calculation completed. Processed: ${processed}, Errors: ${errors.length}`);

  return { success, processed, errors };
};

// Get sub-market analysis for a specific market type
export const getSubMarketAnalysis = async (
  homeTeam: string,
  awayTeam: string,
  market: string
): Promise<SubMarketAnalysis[]> => {
  try {
    const homeMatches = await getTeamMatches(homeTeam, 20);
    const awayMatches = await getTeamMatches(awayTeam, 20);
    const allMatches = [...homeMatches, ...awayMatches];

    if (allMatches.length < PROBABILITY_CONFIG.MIN_SAMPLE_SIZE) {
      return [];
    }

    const analysis: SubMarketAnalysis[] = [];

    // Analyze based on market type
    if (market === MARKETS.OVER_UNDER) {
      const over2_5 = allMatches.filter(m => (m.homeScore + m.awayScore) > 2.5).length;
      const over2_5Prob = over2_5 / allMatches.length;

      analysis.push({
        market: MARKETS.OVER_UNDER,
        subMarket: SUB_MARKETS.OVER_2_5,
        occurrences: over2_5,
        totalMatches: allMatches.length,
        probability: over2_5Prob,
        confidence: getConfidenceLevel(over2_5Prob, allMatches.length)
      });
    }

    return analysis;
  } catch (error) {
    console.error('Error in sub-market analysis:', error);
    return [];
  }
};

// Enhanced team form analysis using paid plan data
export const analyzeTeamForm = async (teamName: string, recentMatches: Match[]): Promise<{
  recentForm: number; // 0-1 score for recent performance
  overallForm: number; // 0-1 score for overall performance
  keyPlayerImpact: number; // Impact of key players (injuries, form)
  attackingForm: number; // Goals scored trend
  defensiveForm: number; // Goals conceded trend
}> => {
  if (recentMatches.length < 3) {
    return {
      recentForm: 0.5,
      overallForm: 0.5,
      keyPlayerImpact: 0,
      attackingForm: 0.5,
      defensiveForm: 0.5
    };
  }

  // Analyze recent form (last 5 matches)
  const recentMatches_5 = recentMatches.slice(0, 5);
  const recentWins = recentMatches_5.filter(m => 
    (m.homeTeam === teamName && m.homeScore > m.awayScore) ||
    (m.awayTeam === teamName && m.awayScore > m.homeScore)
  ).length;
  const recentForm = recentWins / recentMatches_5.length;

  // Analyze overall form (all matches)
  const totalWins = recentMatches.filter(m => 
    (m.homeTeam === teamName && m.homeScore > m.awayScore) ||
    (m.awayTeam === teamName && m.awayScore > m.homeScore)
  ).length;
  const overallForm = totalWins / recentMatches.length;

  // Analyze attacking form (goals scored trend)
  const teamMatches = recentMatches.filter(m => 
    m.homeTeam === teamName || m.awayTeam === teamName
  );
  const goalsScored = teamMatches.map(m => 
    m.homeTeam === teamName ? m.homeScore : m.awayScore
  );
  const avgGoalsScored = goalsScored.reduce((sum, goals) => sum + goals, 0) / goalsScored.length;
  const attackingForm = Math.min(1, avgGoalsScored / 2); // Normalize to 0-1

  // Analyze defensive form (goals conceded trend)
  const goalsConceded = teamMatches.map(m => 
    m.homeTeam === teamName ? m.awayScore : m.homeScore
  );
  const avgGoalsConceded = goalsConceded.reduce((sum, goals) => sum + goals, 0) / goalsConceded.length;
  const defensiveForm = Math.max(0, 1 - (avgGoalsConceded / 2)); // Invert and normalize

  return {
    recentForm,
    overallForm,
    keyPlayerImpact: 0, // TODO: Implement with squad data
    attackingForm,
    defensiveForm
  };
};

// Enhanced probability calculation with form analysis
const calculateEnhancedProbabilities = async (
  event: Event,
  homeMatches: Match[],
  awayMatches: Match[]
): Promise<Omit<Probability, '$id' | '$createdAt' | '$updatedAt'>[]> => {
  const probabilities: Omit<Probability, '$id' | '$createdAt' | '$updatedAt'>[] = [];

  // Analyze team forms
  const homeForm = await analyzeTeamForm(event.homeTeam, homeMatches);
  const awayForm = await analyzeTeamForm(event.awayTeam, awayMatches);

  // Enhanced 1X2 calculation with form analysis
  const homeAdvantage = PROBABILITY_CONFIG.HOME_AWAY_FACTOR;
  const formDifference = (homeForm.recentForm - awayForm.recentForm) * 0.1;
  
  // Base probabilities from historical data
  const homeWins = homeMatches.filter(m =>
    (m.homeTeam === event.homeTeam && m.homeScore > m.awayScore) ||
    (m.awayTeam === event.homeTeam && m.awayScore > m.homeScore)
  ).length;
  const awayWins = awayMatches.filter(m =>
    (m.homeTeam === event.awayTeam && m.homeScore > m.awayScore) ||
    (m.awayTeam === event.awayTeam && m.awayScore > m.homeScore)
  ).length;
  const draws = homeMatches.filter(m => m.homeScore === m.awayScore).length;

  const totalMatches = Math.max(homeMatches.length, awayMatches.length, PROBABILITY_CONFIG.MIN_SAMPLE_SIZE);
  
  // Enhanced probability calculation
  let homeWinProb = (homeWins / totalMatches) + homeAdvantage + formDifference;
  let awayWinProb = (awayWins / totalMatches) - homeAdvantage - formDifference;
  let drawProb = draws / totalMatches;

  // Normalize probabilities
  const total = homeWinProb + awayWinProb + drawProb;
  homeWinProb = Math.max(0.1, Math.min(0.8, homeWinProb / total));
  awayWinProb = Math.max(0.1, Math.min(0.8, awayWinProb / total));
  drawProb = Math.max(0.1, Math.min(0.8, drawProb / total));

  // Re-normalize to ensure they sum to 1
  const finalTotal = homeWinProb + awayWinProb + drawProb;
  homeWinProb /= finalTotal;
  awayWinProb /= finalTotal;
  drawProb /= finalTotal;

  probabilities.push(
    {
      eventId: event.$id,
      market: MARKETS.MAIN,
      subMarket: SUB_MARKETS.HOME_WIN,
      probability: homeWinProb,
      confidence: getConfidenceLevel(homeWinProb, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.MAIN,
      subMarket: SUB_MARKETS.DRAW,
      probability: drawProb,
      confidence: getConfidenceLevel(drawProb, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    },
    {
      eventId: event.$id,
      market: MARKETS.MAIN,
      subMarket: SUB_MARKETS.AWAY_WIN,
      probability: awayWinProb,
      confidence: getConfidenceLevel(awayWinProb, totalMatches),
      sampleSize: totalMatches,
      lastCalculated: new Date().toISOString(),
    }
  );

  // Enhanced Over/Under calculation with attacking/defensive form
  const allMatches = [...homeMatches, ...awayMatches];
  if (allMatches.length >= PROBABILITY_CONFIG.MIN_SAMPLE_SIZE) {
    const avgGoals = allMatches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0) / allMatches.length;
    
    // Adjust based on attacking/defensive form
    const formAdjustedAvg = avgGoals + 
      (homeForm.attackingForm + awayForm.attackingForm - homeForm.defensiveForm - awayForm.defensiveForm) * 0.5;

    // Calculate over/under probabilities based on adjusted average
    const over1_5Prob = Math.min(0.95, Math.max(0.05, 1 - Math.exp(-formAdjustedAvg * 0.8)));
    const over2_5Prob = Math.min(0.9, Math.max(0.05, 1 - Math.exp(-formAdjustedAvg * 0.6)));
    const over3_5Prob = Math.min(0.8, Math.max(0.05, 1 - Math.exp(-formAdjustedAvg * 0.4)));

    probabilities.push(
      {
        eventId: event.$id,
        market: MARKETS.OVER_UNDER,
        subMarket: SUB_MARKETS.OVER_1_5,
        probability: over1_5Prob,
        confidence: getConfidenceLevel(over1_5Prob, allMatches.length),
        sampleSize: allMatches.length,
        lastCalculated: new Date().toISOString(),
      },
      {
        eventId: event.$id,
        market: MARKETS.OVER_UNDER,
        subMarket: SUB_MARKETS.UNDER_1_5,
        probability: 1 - over1_5Prob,
        confidence: getConfidenceLevel(1 - over1_5Prob, allMatches.length),
        sampleSize: allMatches.length,
        lastCalculated: new Date().toISOString(),
      },
      {
        eventId: event.$id,
        market: MARKETS.OVER_UNDER,
        subMarket: SUB_MARKETS.OVER_2_5,
        probability: over2_5Prob,
        confidence: getConfidenceLevel(over2_5Prob, allMatches.length),
        sampleSize: allMatches.length,
        lastCalculated: new Date().toISOString(),
      },
      {
        eventId: event.$id,
        market: MARKETS.OVER_UNDER,
        subMarket: SUB_MARKETS.UNDER_2_5,
        probability: 1 - over2_5Prob,
        confidence: getConfidenceLevel(1 - over2_5Prob, allMatches.length),
        sampleSize: allMatches.length,
        lastCalculated: new Date().toISOString(),
      },
      {
        eventId: event.$id,
        market: MARKETS.OVER_UNDER,
        subMarket: SUB_MARKETS.OVER_3_5,
        probability: over3_5Prob,
        confidence: getConfidenceLevel(over3_5Prob, allMatches.length),
        sampleSize: allMatches.length,
        lastCalculated: new Date().toISOString(),
      },
      {
        eventId: event.$id,
        market: MARKETS.OVER_UNDER,
        subMarket: SUB_MARKETS.UNDER_3_5,
        probability: 1 - over3_5Prob,
        confidence: getConfidenceLevel(1 - over3_5Prob, allMatches.length),
        sampleSize: allMatches.length,
        lastCalculated: new Date().toISOString(),
      }
    );
  }

  // Add BTTS calculation
  const bttsProbs = calculateBTTSProbabilities(
    event,
    homeMatches,
    awayMatches,
    []
  );
  probabilities.push(...bttsProbs);

  return probabilities;
};

// Utility function to get probability statistics
export const getProbabilityStats = async () => {
  try {
    const { databases, DATABASE_ID, COLLECTIONS } = await import('./appwrite');
    const { Query } = await import('appwrite');

    const highConfProbs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROBABILITIES,
      [Query.equal('confidence', 'High')]
    );

    const mediumConfProbs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROBABILITIES,
      [Query.equal('confidence', 'Medium')]
    );

    return {
      totalProbabilities: highConfProbs.total + mediumConfProbs.total,
      highConfidence: highConfProbs.total,
      mediumConfidence: mediumConfProbs.total,
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting probability stats:', error);
    return {
      totalProbabilities: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      error: String(error)
    };
  }
};