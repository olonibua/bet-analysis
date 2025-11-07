import { NextRequest } from 'next/server';
import { getEventById, getTeamMatches, getHistoricalMatches } from '@/lib/database';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, homeTeam, awayTeam, question } = body;

    if (!eventId || !homeTeam || !awayTeam || !question) {
      return Response.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    console.log(`💬 Chat request for ${homeTeam} vs ${awayTeam}: "${question}"`);

    // Get match data
    const event = await getEventById(eventId);
    if (!event) {
      return Response.json(
        {
          success: false,
          error: 'Match not found',
        },
        { status: 404 }
      );
    }

    // Get historical data
    const [homeMatches, awayMatches, headToHead] = await Promise.all([
      getTeamMatches(homeTeam, 10),
      getTeamMatches(awayTeam, 10),
      getHistoricalMatches(homeTeam, awayTeam, 5),
    ]);

    // Build context for AI
    const homeStats = {
      recentForm: homeMatches
        .slice(0, 5)
        .map((m) => {
          const isHome = m.homeTeam === homeTeam;
          const scored = isHome ? m.homeScore : m.awayScore;
          const conceded = isHome ? m.awayScore : m.homeScore;
          return `${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (Scored: ${scored}, Conceded: ${conceded})`;
        })
        .join('\n'),
    };

    const awayStats = {
      recentForm: awayMatches
        .slice(0, 5)
        .map((m) => {
          const isHome = m.homeTeam === awayTeam;
          const scored = isHome ? m.homeScore : m.awayScore;
          const conceded = isHome ? m.awayScore : m.homeScore;
          return `${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (Scored: ${scored}, Conceded: ${conceded})`;
        })
        .join('\n'),
    };

    const h2hSummary =
      headToHead.length > 0
        ? headToHead
            .map(
              (m) =>
                `${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}`
            )
            .join('\n')
        : 'No recent head-to-head matches';

    // Create AI prompt
    const prompt = `You are a professional football betting analyst. A user is asking a specific question about the upcoming match.

**Match:** ${homeTeam} vs ${awayTeam}
**League:** ${event.league}
**Date:** ${new Date(event.datetime).toLocaleString()}

**${homeTeam} Recent Form (last 5 matches):**
${homeStats.recentForm}

**${awayTeam} Recent Form (last 5 matches):**
${awayStats.recentForm}

**Head-to-Head (last 5 matches):**
${h2hSummary}

**User Question:** "${question}"

IMPORTANT: Answer ONLY the specific question the user asked. Do not provide information about betting markets they didn't ask about.

For example:
- If they ask about corners, analyze corner patterns from the data and provide corner predictions only
- If they ask about cards, analyze booking patterns and provide card predictions only
- If they ask about goalscorers, focus on attacking players and scoring patterns only
- If they ask about first half, analyze first half performance only

Use the historical data above to support your answer. Be specific with numbers and patterns. Keep response to 2-3 sentences max, directly answering their question.`;

    console.log('🤖 Sending request to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional football betting analyst. Provide concise, data-driven betting advice.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content || 'No response generated';

    console.log('✅ AI response generated');

    return Response.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
