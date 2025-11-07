import { getHistoricalMatches, convertMatchToMatch, getCurrentRateLimit } from './football-api';
import { createMatch } from './database';
import { databaseRateLimiter, withRetry } from './rate-limiter';
import { Query } from 'appwrite';
import { serverDatabases as databases, DATABASE_ID, COLLECTIONS } from './appwrite';

/**
 * Simple, clean historical data crawler for specific teams
 * Fetches last 90 days of matches for a team
 */
export async function crawlTeamHistory(
  teamName: string,
  competitionCode: string
): Promise<{ success: boolean; matchesCreated: number }> {
  console.log(`  📥 Crawling historical data for ${teamName}...`);

  try {
    // Get last 90 days of matches
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    // Fetch historical matches from API
    const matches = await getHistoricalMatches(competitionCode, dateFrom, dateTo);
    console.log(`  ✓ Found ${matches.length} finished matches in ${competitionCode}`);

    // Filter matches involving this team
    const teamMatches = matches.filter(
      m => m.homeTeam.name === teamName || m.awayTeam.name === teamName
    );

    console.log(`  ✓ ${teamMatches.length} matches involve ${teamName}`);

    let matchesCreated = 0;
    const rateLimit = getCurrentRateLimit();

    // Process each match
    for (let i = 0; i < teamMatches.length; i++) {
      const match = teamMatches[i];
      const matchData = convertMatchToMatch(match);

      try {
        // Check if match already exists
        const existingMatches = await withRetry(async () => {
          await databaseRateLimiter.waitIfNeeded();
          return databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.MATCHES,
            [Query.equal('externalId', matchData.externalId || '')]
          );
        });

        if (existingMatches.documents.length === 0) {
          // Create new match
          await withRetry(async () => {
            await databaseRateLimiter.waitIfNeeded();
            return createMatch(matchData);
          });
          matchesCreated++;
          console.log(`    ✓ Saved: ${matchData.homeTeam} ${matchData.homeScore}-${matchData.awayScore} ${matchData.awayTeam}`);
        }

        // Rate limiting - wait between matches (not after last one)
        if (i < teamMatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to avoid overwhelming DB
        }
      } catch (error) {
        console.log(`    ⚠️  Could not save match: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
      }
    }

    console.log(`  ✅ Crawled ${teamName}: ${matchesCreated} new matches saved`);
    return { success: true, matchesCreated };

  } catch (error) {
    console.error(`  ❌ Error crawling ${teamName} history:`, error);
    return { success: false, matchesCreated: 0 };
  }
}

/**
 * Crawl historical data for both teams in a matchup
 * This ensures we have enough data to make predictions
 */
export async function crawlMatchupHistory(
  homeTeam: string,
  awayTeam: string,
  competitionCode: string
): Promise<{ success: boolean; totalMatchesCreated: number }> {
  console.log(`\n📚 Crawling historical data for matchup: ${homeTeam} vs ${awayTeam}`);

  const rateLimit = getCurrentRateLimit();

  // Crawl home team history
  const homeResult = await crawlTeamHistory(homeTeam, competitionCode);

  // Rate limiting between teams (respect API limits)
  await new Promise(resolve => setTimeout(resolve, rateLimit.delayMs));

  // Crawl away team history
  const awayResult = await crawlTeamHistory(awayTeam, competitionCode);

  const totalMatchesCreated = homeResult.matchesCreated + awayResult.matchesCreated;
  const success = homeResult.success && awayResult.success;

  console.log(`✅ Matchup history crawl complete: ${totalMatchesCreated} total matches saved\n`);

  return { success, totalMatchesCreated };
}
