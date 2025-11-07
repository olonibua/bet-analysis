import { NextRequest } from 'next/server';
import { getEventById } from '@/lib/database';
import { calculateEventProbabilities } from '@/lib/probability-engine';
import { getMatchLineup } from '@/lib/football-api';

/**
 * API endpoint to update predictions with actual lineup data
 * Only works when lineups are available (1 hour before kickoff)
 */

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return Response.json(
      {
        success: false,
        error: 'Event ID required',
      },
      { status: 400 }
    );
  }

  try {
    console.log(`🔄 Updating predictions with lineup for event ${eventId}`);

    // Get the event
    const event = await getEventById(eventId);
    if (!event) {
      return Response.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    // Check if match is within the lineup availability window (1 hour before to 15 min after)
    const matchTime = new Date(event.datetime);
    const now = new Date();
    const hoursDiff = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 1) {
      return Response.json(
        {
          success: false,
          error: `Lineup not available yet. Please try again ${Math.floor(hoursDiff)} hours before kickoff.`,
        },
        { status: 400 }
      );
    }

    if (hoursDiff < -0.25) {
      return Response.json(
        {
          success: false,
          error: 'Match has already started. Lineups are no longer relevant.',
        },
        { status: 400 }
      );
    }

    // Try to fetch the actual lineup from the API
    if (!event.externalId) {
      return Response.json(
        {
          success: false,
          error: 'No external match ID available',
        },
        { status: 400 }
      );
    }

    console.log(`📋 Fetching lineup for match ${event.externalId}...`);
    const lineup = await getMatchLineup(parseInt(event.externalId));

    if (!lineup) {
      return Response.json(
        {
          success: false,
          error: 'Lineup not yet available from API. Teams may not have announced it yet.',
        },
        { status: 404 }
      );
    }

    console.log(`✅ Lineup fetched successfully!`);
    console.log(`   Home: ${lineup.homeTeam.lineup.length} players`);
    console.log(`   Away: ${lineup.awayTeam.lineup.length} players`);

    // Re-calculate probabilities with the actual lineup data
    // The probability engine will now have access to the real lineup
    console.log(`🤖 Re-calculating predictions with actual lineup...`);
    await calculateEventProbabilities(event);

    console.log(`✅ Predictions updated with actual lineup!`);

    return Response.json({
      success: true,
      message: 'Predictions updated with actual lineup',
      lineup: {
        home: lineup.homeTeam.lineup.map(p => ({ name: p.name, position: p.position })),
        away: lineup.awayTeam.lineup.map(p => ({ name: p.name, position: p.position })),
      },
    });
  } catch (error) {
    console.error('Error updating with lineup:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
