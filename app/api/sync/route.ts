import { NextRequest } from 'next/server';
import { crawlLeagueFixtures } from '@/lib/data-crawler';
import { getEventsWithProbabilities } from '@/lib/database';
import { calculateEventProbabilities } from '@/lib/probability-engine';
import { crawlMatchupHistory } from '@/lib/historical-data-crawler';

/**
 * New clean API endpoint for loading leagues and calculating probabilities
 * Supports streaming progress updates to the frontend
 */

// Map full names to API codes
const LEAGUE_NAME_TO_CODE: Record<string, string> = {
  'Premier League': 'PL',
  'Primera Division': 'PD',
  'Bundesliga': 'BL1',
  'Serie A': 'SA',
  'Ligue 1': 'FL1',
  'UEFA Champions League': 'CL',
  'UEFA Europa League': 'EL',
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const leagueName = searchParams.get('league'); // This is now full name
  const countParam = searchParams.get('count');
  const matchCount = countParam ? parseInt(countParam, 10) : 3;

  // Map full name to code
  const leagueCode = leagueName ? LEAGUE_NAME_TO_CODE[leagueName] : null;

  if (!leagueName || !leagueCode) {
    return Response.json(
      {
        success: false,
        error: 'Valid league parameter required',
      },
      { status: 400 }
    );
  }

  if (action === 'load') {
    // Stream progress updates using Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send progress updates
        const sendProgress = (data: { type: string; progress?: { current: number; total: number; currentMatch: string; stage: string }; matches?: unknown[]; error?: string }) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {

          // Step 1: Fetch fixtures
          sendProgress({
            type: 'progress',
            progress: {
              current: 0,
              total: matchCount,
              currentMatch: 'Starting...',
              stage: 'Fetching fixtures',
            },
          });

          console.log(`📥 Fetching fixtures for ${leagueName} (code: ${leagueCode})...`);
          const fixturesResult = await crawlLeagueFixtures(leagueCode, matchCount);
          console.log(`✅ Fixtures result:`, fixturesResult);

          if (!fixturesResult.success) {
            console.error('❌ Failed to fetch fixtures');
            sendProgress({
              type: 'error',
              error: `Failed to fetch fixtures for ${leagueName}. This could be due to API rate limits or the league may not be available. Please try again in a few moments.`,
            });
            controller.close();
            return;
          }

          // Step 2: Get the events we just created (or existing events)
          console.log(`📊 Loading events for ${leagueName}...`);
          const allEvents = await getEventsWithProbabilities(50);
          console.log(`✅ Total events in DB: ${allEvents.length}`);

          // DEBUG: Show all unique league names
          const uniqueLeagues = [...new Set(allEvents.map(e => e.league))];
          console.log(`📋 Leagues in DB:`, uniqueLeagues);

          const leagueEvents = allEvents
            .filter((e) => e.league === leagueName)
            .slice(0, matchCount);

          console.log(`✅ ${leagueName} events found: ${leagueEvents.length}`);
          if (leagueEvents.length > 0) {
            console.log(`Events:`, leagueEvents.map(e => `${e.homeTeam} vs ${e.awayTeam}`));
          } else {
            console.log(`❌ No events match league name "${leagueName}"`);
            console.log(`Available leagues:`, uniqueLeagues);
          }

          if (leagueEvents.length === 0) {
            console.error(`❌ No events found for ${leagueName}`);
            sendProgress({
              type: 'error',
              error: `No upcoming matches found for ${leagueName}. This league may not have any scheduled matches in the next 7 days. Try another league like Premier League or La Liga.`,
            });
            controller.close();
            return;
          }

          // Step 3: Crawl historical data for all teams involved
          console.log(`\n📚 Crawling historical data for ${leagueEvents.length} matches\n`);

          for (let i = 0; i < leagueEvents.length; i++) {
            const event = leagueEvents[i];

            sendProgress({
              type: 'progress',
              progress: {
                current: i,
                total: leagueEvents.length,
                currentMatch: `${event.homeTeam} vs ${event.awayTeam}`,
                stage: 'Fetching historical data',
              },
            });

            // Crawl historical match data for both teams
            await crawlMatchupHistory(event.homeTeam, event.awayTeam, leagueCode);

            // Rate limiting between crawls
            if (i < leagueEvents.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          // Step 4: Calculate probabilities for each match
          console.log(`\n🚀 Starting probability calculation for ${leagueEvents.length} matches\n`);

          for (let i = 0; i < leagueEvents.length; i++) {
            const event = leagueEvents[i];

            console.log(`\n[${i + 1}/${leagueEvents.length}] 🏆 Processing: ${event.homeTeam} vs ${event.awayTeam}`);

            sendProgress({
              type: 'progress',
              progress: {
                current: i,
                total: leagueEvents.length,
                currentMatch: `${event.homeTeam} vs ${event.awayTeam}`,
                stage: 'Calculating probabilities',
              },
            });

            try {
              console.log(`  📊 Calculating probabilities...`);
              // Calculate probabilities (this will update progress internally)
              await calculateEventProbabilities(event);
              console.log(`  ✅ Probabilities calculated successfully!`);

              sendProgress({
                type: 'progress',
                progress: {
                  current: i + 1,
                  total: leagueEvents.length,
                  currentMatch: `${event.homeTeam} vs ${event.awayTeam}`,
                  stage: 'Complete',
                },
              });

              // Wait between matches to respect rate limits
              // DEEP_DATA plan: 30 calls/min = 2s delay, but we use 2.5s to be safe
              if (i < leagueEvents.length - 1) {
                console.log(`  ⏳ Waiting 2.5s before next match...\n`);
                await new Promise((resolve) => setTimeout(resolve, 2500));
              }
            } catch (error) {
              console.error(`  ❌ Error processing ${event.homeTeam} vs ${event.awayTeam}:`, error);
              // Continue with next match even if one fails
            }
          }

          console.log(`\n✅ All matches processed!\n`);


          // Step 4: Get final results with probabilities
          const finalEvents = await getEventsWithProbabilities(matchCount);
          const finalLeagueEvents = finalEvents.filter((e) => e.league === leagueName);

          sendProgress({
            type: 'complete',
            matches: finalLeagueEvents,
          });

          controller.close();
        } catch (error) {
          console.error('API sync error:', error);
          sendProgress({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  return Response.json(
    {
      success: false,
      error: 'Invalid action. Use ?action=load&league=PL&count=3',
    },
    { status: 400 }
  );
}

// GET endpoint to check status
export async function GET() {
  try {
    const events = await getEventsWithProbabilities(10);

    return Response.json({
      success: true,
      totalEvents: events.length,
      eventsWithProbabilities: events.filter((e) => e.topProbabilities.length > 0)
        .length,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
