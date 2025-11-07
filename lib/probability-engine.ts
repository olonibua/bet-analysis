import {
  getHistoricalMatches,
  getTeamMatches,
  createProbability,
  deleteProbabilitiesByEvent,
} from './database';
import { Match, Event, Probability } from './types';
import { analyzeMatchWithAI } from './openai-analyzer';
import { databaseRateLimiter, withRetry } from './rate-limiter';
import { getEnhancedMatchData, getCurrentRateLimit } from './football-api';

/**
 * New clean probability engine using AI-powered analysis
 * This provides accurate predictions by:
 * 1. Fetching historical match data for both teams
 * 2. Using OpenAI to analyze form, trends, and context
 * 3. Storing probabilities in the database
 */

export interface ProbabilityCalculationResult {
  success: boolean;
  processed: number;
  errors: string[];
}

/**
 * Calculate probabilities for a single event using AI analysis
 */
export async function calculateEventProbabilities(
  event: Event
): Promise<Probability[]> {
  console.log(
    `🤖 Analyzing: ${event.homeTeam} vs ${event.awayTeam} (${event.league})`
  );

  try {
    // Step 1: Clear existing probabilities
    await deleteProbabilitiesByEvent(event.$id);
    console.log('  ✓ Cleared existing probabilities');

    // Step 2: Fetch historical data
    console.log('  📊 Fetching historical data...');
    const [homeMatches, awayMatches, headToHead] = await Promise.all([
      getTeamMatches(event.homeTeam, 20),
      getTeamMatches(event.awayTeam, 20),
      getHistoricalMatches(event.homeTeam, event.awayTeam, 10),
    ]);

    console.log(
      `  ✓ Data: ${homeMatches.length} home matches, ${awayMatches.length} away matches, ${headToHead.length} H2H`
    );

    // Step 2.5: Fetch DEEP_DATA for recent matches (lineups, player stats, bookings)
    console.log('  📦 Fetching DEEP_DATA for recent matches...');
    const enhancedData = [];

    // Get enhanced data for last 5 home team matches (with rate limiting)
    const recentHomeMatches = homeMatches.slice(0, 5);
    for (let i = 0; i < recentHomeMatches.length; i++) {
      const match = recentHomeMatches[i];
      if (match.externalId) {
        try {
          const enhanced = await getEnhancedMatchData(parseInt(match.externalId));
          if (enhanced) {
            enhancedData.push({
              matchId: match.externalId,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              ...enhanced
            });
          }

          // Rate limiting for DEEP_DATA plan (30 calls/min = 2s delay)
          if (i < recentHomeMatches.length - 1) {
            const rateLimit = getCurrentRateLimit();
            await new Promise(resolve => setTimeout(resolve, rateLimit.delayMs));
          }
        } catch (error) {
          console.log(`  ⚠️  Could not fetch DEEP_DATA for match ${match.externalId}`);
        }
      }
    }

    // Get enhanced data for last 5 away team matches (with rate limiting)
    const recentAwayMatches = awayMatches.slice(0, 5);
    for (let i = 0; i < recentAwayMatches.length; i++) {
      const match = recentAwayMatches[i];
      if (match.externalId) {
        try {
          const enhanced = await getEnhancedMatchData(parseInt(match.externalId));
          if (enhanced) {
            enhancedData.push({
              matchId: match.externalId,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              ...enhanced
            });
          }

          // Rate limiting
          if (i < recentAwayMatches.length - 1) {
            const rateLimit = getCurrentRateLimit();
            await new Promise(resolve => setTimeout(resolve, rateLimit.delayMs));
          }
        } catch (error) {
          console.log(`  ⚠️  Could not fetch DEEP_DATA for match ${match.externalId}`);
        }
      }
    }

    console.log(`  ✓ DEEP_DATA fetched for ${enhancedData.length} matches`);

    // Step 3: Use AI to analyze and get probabilities (now with DEEP_DATA)
    console.log('  🧠 Running AI analysis with DEEP_DATA...');
    const analysis = await analyzeMatchWithAI(
      event.homeTeam,
      event.awayTeam,
      homeMatches,
      awayMatches,
      headToHead,
      enhancedData
    );

    console.log(`  ✓ AI analysis complete (Confidence: ${analysis.confidence})`);

    // Step 4: Convert AI analysis to probability objects
    const now = new Date().toISOString();
    const probabilities: Omit<
      Probability,
      '$id' | '$createdAt' | '$updatedAt'
    >[] = [
      // Match Result Market
      {
        eventId: event.$id,
        market: 'Match Result',
        subMarket: 'Home Win',
        probability: analysis.winProbability,
        confidence: analysis.confidence,
        sampleSize: homeMatches.length + headToHead.length,
        lastCalculated: now,
      },
      {
        eventId: event.$id,
        market: 'Match Result',
        subMarket: 'Draw',
        probability: analysis.drawProbability,
        confidence: analysis.confidence,
        sampleSize: homeMatches.length + awayMatches.length,
        lastCalculated: now,
      },
      {
        eventId: event.$id,
        market: 'Match Result',
        subMarket: 'Away Win',
        probability: analysis.lossProbability,
        confidence: analysis.confidence,
        sampleSize: awayMatches.length + headToHead.length,
        lastCalculated: now,
      },

      // Over/Under 2.5 Goals Market
      {
        eventId: event.$id,
        market: 'Over/Under 2.5',
        subMarket: 'Over 2.5',
        probability: analysis.over25Probability,
        confidence: analysis.confidence,
        sampleSize: homeMatches.length + awayMatches.length,
        lastCalculated: now,
      },
      {
        eventId: event.$id,
        market: 'Over/Under 2.5',
        subMarket: 'Under 2.5',
        probability: analysis.under25Probability,
        confidence: analysis.confidence,
        sampleSize: homeMatches.length + awayMatches.length,
        lastCalculated: now,
      },

      // Both Teams to Score Market
      {
        eventId: event.$id,
        market: 'Both Teams to Score',
        subMarket: 'Yes',
        probability: analysis.bttsYesProbability,
        confidence: analysis.confidence,
        sampleSize: homeMatches.length + awayMatches.length,
        lastCalculated: now,
      },
      {
        eventId: event.$id,
        market: 'Both Teams to Score',
        subMarket: 'No',
        probability: analysis.bttsNoProbability,
        confidence: analysis.confidence,
        sampleSize: homeMatches.length + awayMatches.length,
        lastCalculated: now,
      },
    ];

    // Step 5: Save to database with rate limiting
    console.log('  💾 Saving probabilities...');
    const createdProbabilities: Probability[] = [];

    for (const prob of probabilities) {
      try {
        await databaseRateLimiter.waitIfNeeded();
        const created = (await withRetry(() =>
          createProbability(prob)
        )) as unknown as Probability;
        createdProbabilities.push(created);
      } catch (error) {
        console.error('  ✗ Error saving probability:', error);
      }
    }

    console.log(
      `  ✅ Complete: ${createdProbabilities.length} probabilities saved`
    );
    console.log(`  💡 AI Reasoning: ${analysis.reasoning}\n`);

    return createdProbabilities;
  } catch (error) {
    console.error('❌ Error calculating probabilities:', error);
    throw error;
  }
}

/**
 * Calculate probabilities for multiple events (batch processing)
 * Respects rate limits and provides progress updates
 */
export async function calculateBatchProbabilities(
  events: Event[]
): Promise<ProbabilityCalculationResult> {
  const errors: string[] = [];
  let processed = 0;

  console.log(`\n🚀 Starting batch probability calculation for ${events.length} events\n`);

  for (const event of events) {
    try {
      await calculateEventProbabilities(event);
      processed++;

      // Rate limiting: Wait between events to respect Appwrite limits
      if (processed < events.length) {
        console.log('⏳ Waiting 5 seconds before next event (rate limit)...\n');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      const errorMsg = `Failed to calculate probabilities for ${event.homeTeam} vs ${event.awayTeam}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      console.error(`❌ ${errorMsg}\n`);
      errors.push(errorMsg);
    }
  }

  console.log(`\n✅ Batch complete: ${processed}/${events.length} events processed\n`);

  return {
    success: errors.length === 0,
    processed,
    errors,
  };
}
