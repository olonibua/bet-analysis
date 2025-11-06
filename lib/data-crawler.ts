import {
  getAllUpcomingFixtures,
  getLeagueFixtures,
  getHistoricalMatches,
  convertFixtureToEvent,
  convertMatchToMatch,
  COMPETITIONS,
  testApiConnection
} from './football-api';
import {
  createEvent,
  createMatch,
  getEventById,
  getTeamByName,
  createTeam
} from './database';
import { Event, Match, Team } from './types';
import { databaseRateLimiter, withRetry, processBatch } from './rate-limiter';

// Main function to crawl and store upcoming fixtures
export const crawlUpcomingFixtures = async (): Promise<{ success: boolean; eventsCreated: number; errors: string[] }> => {
  console.log('Starting fixture crawl...');

  // Test API connection first
  const isConnected = await testApiConnection();
  if (!isConnected) {
    return { success: false, eventsCreated: 0, errors: ['API connection failed'] };
  }

  try {
    // Fetch upcoming fixtures from Football-data API
    const fixtures = await getAllUpcomingFixtures(7); // Next 7 days
    console.log(`Found ${fixtures.length} upcoming fixtures`);

    let eventsCreated = 0;
    const errors: string[] = [];

    // Process fixtures in batches with rate limiting
    const { results, errors: batchErrors } = await processBatch(
      fixtures,
      async (fixture) => {
        // Convert API fixture to our Event format
        const eventData = convertFixtureToEvent(fixture);

        // Check if event already exists by external ID with rate limiting
        const { databases, DATABASE_ID, COLLECTIONS } = await import('./appwrite');
        const { Query } = await import('appwrite');

        const existingEvents = await withRetry(async () => {
          await databaseRateLimiter.waitIfNeeded();
          return databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.EVENTS,
            [Query.equal('externalId', eventData.externalId)]
          );
        });

        if (existingEvents.documents.length === 0) {
          // Create new event with rate limiting
          await withRetry(async () => {
            await databaseRateLimiter.waitIfNeeded();
            return createEvent(eventData);
          });
          eventsCreated++;
          console.log(`Created event: ${eventData.homeTeam} vs ${eventData.awayTeam}`);

          // Ensure teams exist in database with rate limiting
          await ensureTeamsExistWithRateLimit(eventData.homeTeam, eventData.awayTeam, eventData.league, eventData.season);
          return true;
        } else {
          console.log(`Event already exists: ${eventData.homeTeam} vs ${eventData.awayTeam}`);
          return false;
        }
      },
      5, // Process 5 fixtures per batch
      1000 // 1 second delay between batches
    );

    errors.push(...batchErrors);

    console.log(`Fixture crawl completed. Created ${eventsCreated} new events.`);
    return { success: true, eventsCreated, errors };

  } catch (error) {
    console.error('Error in fixture crawl:', error);
    return { success: false, eventsCreated: 0, errors: [String(error)] };
  }
};

// Main function to crawl fixtures for a specific league only
export const crawlLeagueFixtures = async (
  competitionCode: string,
  days: number = 7
): Promise<{ success: boolean; eventsCreated: number; errors: string[] }> => {
  console.log(`Starting fixture crawl for ${competitionCode}...`);

  // Test API connection first
  const isConnected = await testApiConnection();
  if (!isConnected) {
    return { success: false, eventsCreated: 0, errors: ['API connection failed'] };
  }

  try {
    // Fetch upcoming fixtures for specific league only
    const fixtures = await getLeagueFixtures(competitionCode, days);
    console.log(`Found ${fixtures.length} upcoming fixtures for ${competitionCode}`);

    let eventsCreated = 0;
    const errors: string[] = [];

    // Process fixtures in batches with rate limiting
    const { results, errors: batchErrors } = await processBatch(
      fixtures,
      async (fixture) => {
        // Convert API fixture to our Event format
        const eventData = convertFixtureToEvent(fixture);

        // Check if event already exists by external ID with rate limiting
        const { databases, DATABASE_ID, COLLECTIONS } = await import('./appwrite');
        const { Query } = await import('appwrite');

        const existingEvents = await withRetry(async () => {
          await databaseRateLimiter.waitIfNeeded();
          return databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.EVENTS,
            [Query.equal('externalId', eventData.externalId)]
          );
        });

        if (existingEvents.documents.length === 0) {
          // Create new event with rate limiting
          await withRetry(async () => {
            await databaseRateLimiter.waitIfNeeded();
            return createEvent(eventData);
          });
          eventsCreated++;
          console.log(`Created event: ${eventData.homeTeam} vs ${eventData.awayTeam}`);

          // Ensure teams exist in database with rate limiting
          await ensureTeamsExistWithRateLimit(eventData.homeTeam, eventData.awayTeam, eventData.league, eventData.season);
          return true;
        } else {
          console.log(`Event already exists: ${eventData.homeTeam} vs ${eventData.awayTeam}`);
          return false;
        }
      },
      3, // Process 3 fixtures per batch for single league
      800 // 800ms delay between batches for single league
    );

    errors.push(...batchErrors);

    console.log(`League fixture crawl completed for ${competitionCode}. Created ${eventsCreated} new events.`);
    return { success: true, eventsCreated, errors };

  } catch (error) {
    console.error(`Error in league fixture crawl for ${competitionCode}:`, error);
    return { success: false, eventsCreated: 0, errors: [String(error)] };
  }
};

// Function to crawl historical match data for probability calculations
export const crawlHistoricalMatches = async (days: number = 30): Promise<{ success: boolean; matchesCreated: number; errors: string[] }> => {
  console.log('Starting historical match crawl...');

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    let matchesCreated = 0;
    const errors: string[] = [];

    // Fetch historical matches for major competitions
    const competitions = [COMPETITIONS.PREMIER_LEAGUE, COMPETITIONS.LA_LIGA, COMPETITIONS.BUNDESLIGA];

    for (const competition of competitions) {
      try {
        console.log(`Fetching historical matches for ${competition}...`);
        const matches = await getHistoricalMatches(competition, dateFrom, dateTo);

        // Process matches in batches with rate limiting
        const { results, errors: batchErrors } = await processBatch(
          matches,
          async (match) => {
            const matchData = convertMatchToMatch(match);

            // Check if match already exists with rate limiting
            const { databases, DATABASE_ID, COLLECTIONS } = await import('./appwrite');
            const { Query } = await import('appwrite');

            const existingMatches = await withRetry(async () => {
              await databaseRateLimiter.waitIfNeeded();
              return databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.MATCHES,
                [
                  Query.equal('homeTeam', matchData.homeTeam),
                  Query.equal('awayTeam', matchData.awayTeam),
                  Query.equal('date', matchData.date)
                ]
              );
            });

            if (existingMatches.documents.length === 0) {
              await withRetry(async () => {
                await databaseRateLimiter.waitIfNeeded();
                return createMatch(matchData);
              });
              matchesCreated++;
              console.log(`Created match: ${matchData.homeTeam} ${matchData.homeScore}-${matchData.awayScore} ${matchData.awayTeam}`);
              return true;
            }
            return false;
          },
          3, // Process 3 matches per batch
          1500 // 1.5 second delay between batches
        );

        errors.push(...batchErrors);

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 6100));

      } catch (error) {
        const errorMsg = `Failed to fetch matches for ${competition}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Historical match crawl completed. Created ${matchesCreated} new matches.`);
    return { success: true, matchesCreated, errors };

  } catch (error) {
    console.error('Error in historical match crawl:', error);
    return { success: false, matchesCreated: 0, errors: [String(error)] };
  }
};

// Helper function to ensure teams exist in database
const ensureTeamsExist = async (homeTeam: string, awayTeam: string, league: string, season: string) => {
  const teams = [homeTeam, awayTeam];

  for (const teamName of teams) {
    try {
      const existingTeam = await getTeamByName(teamName);

      if (!existingTeam) {
        const teamData: Omit<Team, '$id' | '$createdAt' | '$updatedAt'> = {
          name: teamName,
          league,
          season,
          externalId: '', // We'll update this when we get team IDs from API
        };

        await createTeam(teamData);
        console.log(`Created team: ${teamName}`);
      }
    } catch (error) {
      console.error(`Error ensuring team exists (${teamName}):`, error);
    }
  }
};

// Rate-limited version of team creation
const ensureTeamsExistWithRateLimit = async (homeTeam: string, awayTeam: string, league: string, season: string) => {
  const teams = [homeTeam, awayTeam];

  for (const teamName of teams) {
    try {
      // Check if team exists with rate limiting
      const existingTeam = await withRetry(async () => {
        await databaseRateLimiter.waitIfNeeded();
        return getTeamByName(teamName);
      });

      if (!existingTeam) {
        const teamData: Omit<Team, '$id' | '$createdAt' | '$updatedAt'> = {
          name: teamName,
          league,
          season,
          externalId: '', // We'll update this when we get team IDs from API
        };

        // Create team with rate limiting
        await withRetry(async () => {
          await databaseRateLimiter.waitIfNeeded();
          return createTeam(teamData);
        });
        console.log(`Created team: ${teamName}`);
      }
    } catch (error) {
      console.error(`Error ensuring team exists (${teamName}):`, error);
    }
  }
};

// Function to run full data sync (fixtures + historical matches)
export const runFullDataSync = async (): Promise<{
  success: boolean;
  fixturesResult: any;
  matchesResult: any;
  totalErrors: string[]
}> => {
  console.log('Starting full data sync...');

  const fixturesResult = await crawlUpcomingFixtures();
  const matchesResult = await crawlHistoricalMatches(7); // Last 7 days (faster, less API calls)

  const totalErrors = [...fixturesResult.errors, ...matchesResult.errors];
  const success = fixturesResult.success && matchesResult.success;

  console.log('Full data sync completed:', {
    eventsCreated: fixturesResult.eventsCreated,
    matchesCreated: matchesResult.matchesCreated,
    totalErrors: totalErrors.length,
    success
  });

  return {
    success,
    fixturesResult,
    matchesResult,
    totalErrors
  };
};

// Scheduled crawling functions (for use with cron jobs)
export const scheduledFixtureCrawl = async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled fixture crawl...`);
  const result = await crawlUpcomingFixtures();
  console.log(`[${new Date().toISOString()}] Scheduled fixture crawl result:`, result);
  return result;
};

export const scheduledHistoricalCrawl = async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled historical match crawl...`);
  const result = await crawlHistoricalMatches(7); // Last 7 days
  console.log(`[${new Date().toISOString()}] Scheduled historical crawl result:`, result);
  return result;
};

// Utility function to get crawling status
export const getCrawlingStatus = async () => {
  try {
    const { databases, DATABASE_ID, COLLECTIONS } = await import('./appwrite');

    const eventsCount = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS);
    const matchesCount = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MATCHES);
    const probabilitiesCount = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROBABILITIES);

    return {
      events: eventsCount.total,
      matches: matchesCount.total,
      probabilities: probabilitiesCount.total,
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting crawling status:', error);
    return {
      events: 0,
      matches: 0,
      probabilities: 0,
      lastUpdate: new Date().toISOString(),
      error: String(error)
    };
  }
};