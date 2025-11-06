import { NextRequest, NextResponse } from 'next/server';
import { runFullDataSync, crawlLeagueFixtures } from '@/lib/data-crawler';
import { getUpcomingEvents, getEventsWithProbabilities } from '@/lib/database';
import { calculateBatchProbabilities } from '@/lib/probability-engine';
import { COMPETITIONS } from '@/lib/football-api';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'full';
    const league = searchParams.get('league'); // New: league parameter

    let result;

    switch (action) {
      case 'refresh':
        // Clear existing events and re-fetch with updated status logic
        const { databases: db, DATABASE_ID: dbId, COLLECTIONS: cols } = await import('@/lib/appwrite');
        const existingEvents = await db.listDocuments(dbId, cols.EVENTS, []);

        console.log(`Clearing ${existingEvents.documents.length} existing events...`);
        for (const event of existingEvents.documents) {
          await db.deleteDocument(dbId, cols.EVENTS, event.$id);
        }

        // Re-fetch league data
        if (!league || !Object.values(COMPETITIONS).includes(league as any)) {
          return NextResponse.json({
            success: false,
            action,
            timestamp: new Date().toISOString(),
            error: 'Valid league parameter required for refresh action'
          }, { status: 400 });
        }

        const refreshResult = await crawlLeagueFixtures(league, 7);
        const refreshCalcResult = await calculateBatchProbabilities(await getUpcomingEvents(50));

        return NextResponse.json({
          success: true,
          action,
          timestamp: new Date().toISOString(),
          data: {
            success: true,
            cleared: existingEvents.documents.length,
            leagueResult: refreshResult,
            calculateResult: refreshCalcResult,
            totalErrors: [...(refreshResult.errors || []), ...(refreshCalcResult.errors || [])]
          }
        });

      case 'crawl':
        // Only crawl data, don't calculate probabilities
        if (league && Object.values(COMPETITIONS).includes(league as any)) {
          // Crawl specific league only
          result = await crawlLeagueFixtures(league, 7);
        } else {
          // Crawl all leagues (original behavior)
          result = await runFullDataSync();
        }
        break;

      case 'league':
        // New: Crawl specific league with probabilities
        if (!league || !Object.values(COMPETITIONS).includes(league as any)) {
          return NextResponse.json({
            success: false,
            action,
            timestamp: new Date().toISOString(),
            error: 'Valid league parameter required for league action'
          }, { status: 400 });
        }

        const leagueResult = await crawlLeagueFixtures(league, 7);

        if (leagueResult.success && leagueResult.eventsCreated > 0) {
          // Calculate probabilities for the new events
          const events = await getUpcomingEvents(50);
          const calculateResult = await calculateBatchProbabilities(events);

          result = {
            success: leagueResult.success && calculateResult.success,
            leagueResult,
            calculateResult,
            totalErrors: [...leagueResult.errors, ...calculateResult.errors]
          };
        } else {
          result = {
            success: leagueResult.success,
            leagueResult,
            calculateResult: { success: true, processed: 0, errors: [] },
            totalErrors: leagueResult.errors
          };
        }
        break;

      case 'calculate':
        // Only calculate probabilities for existing events
        const events = await getUpcomingEvents(50);
        result = await calculateBatchProbabilities(events);
        break;

      case 'full':
      default:
        // Full sync: crawl data + calculate probabilities
        const crawlResult = await runFullDataSync();

        if (crawlResult.success && crawlResult.fixturesResult.eventsCreated > 0) {
          const eventsForCalculation = await getUpcomingEvents(50);
          const calculateResult = await calculateBatchProbabilities(eventsForCalculation);

          result = {
            success: crawlResult.success && calculateResult.success,
            crawlResult,
            calculateResult,
            totalErrors: [...crawlResult.totalErrors, ...calculateResult.errors]
          };
        } else {
          result = {
            success: crawlResult.success,
            crawlResult,
            calculateResult: { success: true, processed: 0, errors: [] },
            totalErrors: crawlResult.totalErrors
          };
        }
        break;
    }

    return NextResponse.json({
      success: result.success,
      action,
      timestamp: new Date().toISOString(),
      data: result
    }, {
      status: result.success ? 200 : 500
    });

  } catch (error) {
    console.error('Data sync failed:', error);
    return NextResponse.json({
      success: false,
      action: 'unknown',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const events = await getEventsWithProbabilities(10);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        eventsWithProbabilities: events.length,
        totalProbabilities: events.reduce((sum, event) => sum + event.probabilities.length, 0),
        highConfidenceEvents: events.filter(event =>
          event.topProbabilities.some(prob => prob.confidence === 'High')
        ).length
      },
      recentEvents: events.slice(0, 5).map(event => ({
        id: event.$id,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        league: event.league,
        datetime: event.datetime,
        probabilitiesCount: event.probabilities.length,
        topProbability: Math.max(...event.topProbabilities.map(p => p.probability))
      }))
    });

  } catch (error) {
    console.error('Sync status check failed:', error);
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}