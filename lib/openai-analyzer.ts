import { Match } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface AnalysisResult {
  winProbability: number;
  drawProbability: number;
  lossProbability: number;
  over25Probability: number;
  under25Probability: number;
  bttsYesProbability: number;
  bttsNoProbability: number;
  reasoning: string;
  confidence: 'High' | 'Medium' | 'Low';
}

/**
 * Use OpenAI to analyze historical match data and predict probabilities
 * This provides MORE ACCURATE predictions by considering:
 * - Recent form and momentum
 * - Head-to-head history
 * - Home/away performance patterns
 * - Goal-scoring trends
 * - Contextual analysis
 */
export async function analyzeMatchWithAI(
  homeTeam: string,
  awayTeam: string,
  homeMatches: Match[],
  awayMatches: Match[],
  headToHead: Match[],
  enhancedData?: any[]
): Promise<AnalysisResult> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Fallback to simple statistical analysis if no API key
    return fallbackAnalysis(homeMatches, awayMatches, headToHead);
  }

  try {
    // Prepare match data summary (now with DEEP_DATA)
    const prompt = buildAnalysisPrompt(homeTeam, awayTeam, homeMatches, awayMatches, headToHead, enhancedData);

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: 'You are a professional football/soccer match analyst. Analyze historical data and provide accurate probability predictions. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent predictions
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.statusText);
      return fallbackAnalysis(homeMatches, awayMatches, headToHead);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return fallbackAnalysis(homeMatches, awayMatches, headToHead);
    }

    // Parse AI response
    const result = JSON.parse(content);

    return {
      winProbability: result.win_probability / 100,
      drawProbability: result.draw_probability / 100,
      lossProbability: result.loss_probability / 100,
      over25Probability: result.over_25_probability / 100,
      under25Probability: result.under_25_probability / 100,
      bttsYesProbability: result.btts_yes_probability / 100,
      bttsNoProbability: result.btts_no_probability / 100,
      reasoning: result.reasoning,
      confidence: result.confidence as 'High' | 'Medium' | 'Low',
    };
  } catch (error) {
    console.error('Error analyzing match with AI:', error);
    return fallbackAnalysis(homeMatches, awayMatches, headToHead);
  }
}

function buildAnalysisPrompt(
  homeTeam: string,
  awayTeam: string,
  homeMatches: Match[],
  awayMatches: Match[],
  headToHead: Match[],
  enhancedData?: any[]
): string {
  // Calculate recent form (last 5 matches)
  const homeForm = calculateForm(homeTeam, homeMatches.slice(0, 5));
  const awayForm = calculateForm(awayTeam, awayMatches.slice(0, 5));

  // Calculate home/away splits
  const homeHomeRecord = calculateHomeAwayRecord(homeTeam, homeMatches, true);
  const awayAwayRecord = calculateHomeAwayRecord(awayTeam, awayMatches, false);

  // Head-to-head summary
  const h2hSummary = summarizeHeadToHead(homeTeam, awayTeam, headToHead);

  // Calculate goal averages
  const homeGoalAvg = homeMatches.length > 0 ? (homeForm.goalsFor / Math.min(5, homeMatches.length)).toFixed(1) : '0.0';
  const awayGoalAvg = awayMatches.length > 0 ? (awayForm.goalsFor / Math.min(5, awayMatches.length)).toFixed(1) : '0.0';

  // Build enhanced data summary (lineups, player stats, bookings)
  let enhancedDataSummary = '';
  if (enhancedData && enhancedData.length > 0) {
    enhancedDataSummary = '\n\n**DEEP_DATA - Enhanced Match Statistics:**\n';

    const homeTeamEnhanced = enhancedData.filter(d => d.homeTeam === homeTeam || d.awayTeam === homeTeam);
    const awayTeamEnhanced = enhancedData.filter(d => d.homeTeam === awayTeam || d.awayTeam === awayTeam);

    if (homeTeamEnhanced.length > 0) {
      enhancedDataSummary += `\n${homeTeam} Recent Matches (with lineups/bookings):\n`;
      homeTeamEnhanced.slice(0, 3).forEach((match, i) => {
        if (match.statistics) {
          enhancedDataSummary += `  ${i + 1}. ${match.homeTeam} vs ${match.awayTeam}\n`;
          enhancedDataSummary += `     - Yellow Cards: ${match.statistics.totalYellowCards} | Red Cards: ${match.statistics.totalRedCards}\n`;
          enhancedDataSummary += `     - Goals: ${match.statistics.homeGoals}-${match.statistics.awayGoals} | Substitutions: ${match.statistics.homeSubstitutions + match.statistics.awaySubstitutions}\n`;

          if (match.statistics.goalScorers && match.statistics.goalScorers.length > 0) {
            const scorers = match.statistics.goalScorers.map(s => `${s.player} (${s.minute}')`).join(', ');
            enhancedDataSummary += `     - Scorers: ${scorers}\n`;
          }
        }
      });
    }

    if (awayTeamEnhanced.length > 0) {
      enhancedDataSummary += `\n${awayTeam} Recent Matches (with lineups/bookings):\n`;
      awayTeamEnhanced.slice(0, 3).forEach((match, i) => {
        if (match.statistics) {
          enhancedDataSummary += `  ${i + 1}. ${match.homeTeam} vs ${match.awayTeam}\n`;
          enhancedDataSummary += `     - Yellow Cards: ${match.statistics.totalYellowCards} | Red Cards: ${match.statistics.totalRedCards}\n`;
          enhancedDataSummary += `     - Goals: ${match.statistics.homeGoals}-${match.statistics.awayGoals} | Substitutions: ${match.statistics.homeSubstitutions + match.statistics.awaySubstitutions}\n`;

          if (match.statistics.goalScorers && match.statistics.goalScorers.length > 0) {
            const scorers = match.statistics.goalScorers.map(s => `${s.player} (${s.minute}')`).join(', ');
            enhancedDataSummary += `     - Scorers: ${scorers}\n`;
          }
        }
      });
    }

    enhancedDataSummary += `\nTotal DEEP_DATA matches analyzed: ${enhancedData.length}`;
  }

  return `Analyze this upcoming football match and provide probability predictions.

**Match:** ${homeTeam} (Home) vs ${awayTeam} (Away)

**Recent Form (Last 5 Matches):**
- ${homeTeam}: ${homeForm.wins}W-${homeForm.draws}D-${homeForm.losses}L | Goals: ${homeForm.goalsFor} scored (avg ${homeGoalAvg}/game), ${homeForm.goalsAgainst} conceded
- ${awayTeam}: ${awayForm.wins}W-${awayForm.draws}D-${awayForm.losses}L | Goals: ${awayForm.goalsFor} scored (avg ${awayGoalAvg}/game), ${awayForm.goalsAgainst} conceded

**Home/Away Performance:**
- ${homeTeam} at home: ${homeHomeRecord.wins}W-${homeHomeRecord.draws}D-${homeHomeRecord.losses}L (${homeHomeRecord.total} matches)
- ${awayTeam} away: ${awayAwayRecord.wins}W-${awayAwayRecord.draws}D-${awayAwayRecord.losses}L (${awayAwayRecord.total} matches)

**Head-to-Head Record:**
${h2hSummary}
${enhancedDataSummary}

**Analysis Instructions:**
${enhancedData && enhancedData.length > 0 ?
  'You have access to DEEP_DATA including lineups, goal scorers, player statistics, and booking records (yellow/red cards) shown above. Use this rich data to make more accurate predictions.' :
  'You have access to Deep Data including lineups, goal scorers, and player statistics. Consider:'
}

- Recent momentum and form trends
- Goal-scoring patterns and defensive stability
- Home advantage factor (typically +5-10% win probability)
- Head-to-head dominance or psychological factors
- Key player performance (if available in historical data)

Based on this data, provide predictions as JSON with the following structure:
{
  "win_probability": <number 0-100>,
  "draw_probability": <number 0-100>,
  "loss_probability": <number 0-100>,
  "over_25_probability": <number 0-100>,
  "under_25_probability": <number 0-100>,
  "btts_yes_probability": <number 0-100>,
  "btts_no_probability": <number 0-100>,
  "confidence": "<High|Medium|Low>",
  "reasoning": "<brief explanation of key factors>"
}

IMPORTANT:
- win_probability + draw_probability + loss_probability must equal 100
- over_25_probability + under_25_probability must equal 100
- btts_yes_probability + btts_no_probability must equal 100
- Consider recent form, home advantage, and head-to-head
- Confidence should be "High" if sample size > 15 matches, "Medium" if 10-15, "Low" if < 10`;
}

function calculateForm(team: string, matches: Match[]) {
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

  matches.forEach(match => {
    const isHome = match.homeTeam === team;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;

    goalsFor += teamScore;
    goalsAgainst += oppScore;

    if (teamScore > oppScore) wins++;
    else if (teamScore === oppScore) draws++;
    else losses++;
  });

  return { wins, draws, losses, goalsFor, goalsAgainst };
}

function calculateHomeAwayRecord(team: string, matches: Match[], isHome: boolean) {
  const filtered = matches.filter(m =>
    isHome ? m.homeTeam === team : m.awayTeam === team
  );

  let wins = 0, draws = 0, losses = 0;

  filtered.forEach(match => {
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;

    if (teamScore > oppScore) wins++;
    else if (teamScore === oppScore) draws++;
    else losses++;
  });

  return { wins, draws, losses, total: filtered.length };
}

function summarizeHeadToHead(homeTeam: string, awayTeam: string, matches: Match[]): string {
  if (matches.length === 0) {
    return 'No previous head-to-head matches found.';
  }

  let homeWins = 0, draws = 0, awayWins = 0;

  matches.forEach(match => {
    const isHomeAtHome = match.homeTeam === homeTeam;
    const homeScore = isHomeAtHome ? match.homeScore : match.awayScore;
    const awayScore = isHomeAtHome ? match.awayScore : match.homeScore;

    if (homeScore > awayScore) homeWins++;
    else if (homeScore === awayScore) draws++;
    else awayWins++;
  });

  return `${homeTeam} ${homeWins}W-${draws}D-${awayWins}L ${awayTeam} (${matches.length} matches)`;
}

/**
 * Fallback to simple statistical analysis if OpenAI is not available
 */
function fallbackAnalysis(
  homeMatches: Match[],
  awayMatches: Match[],
  headToHead: Match[]
): AnalysisResult {
  // Simple probability calculation based on historical win rates
  const totalMatches = homeMatches.length + awayMatches.length;

  if (totalMatches === 0) {
    return {
      winProbability: 0.40,
      drawProbability: 0.30,
      lossProbability: 0.30,
      over25Probability: 0.55,
      under25Probability: 0.45,
      bttsYesProbability: 0.50,
      bttsNoProbability: 0.50,
      reasoning: 'Insufficient data - using default probabilities',
      confidence: 'Low',
    };
  }

  // Calculate home team win rate
  const homeWins = homeMatches.filter(m =>
    (m.homeTeam === homeMatches[0]?.homeTeam && m.homeScore > m.awayScore) ||
    (m.awayTeam === homeMatches[0]?.homeTeam && m.awayScore > m.homeScore)
  ).length;

  const awayWins = awayMatches.filter(m =>
    (m.homeTeam === awayMatches[0]?.awayTeam && m.homeScore > m.awayScore) ||
    (m.awayTeam === awayMatches[0]?.awayTeam && m.awayScore > m.homeScore)
  ).length;

  const winRate = totalMatches > 0 ? (homeWins + awayWins) / totalMatches : 0.5;

  return {
    winProbability: Math.min(0.45 + winRate * 0.2, 0.70),
    drawProbability: 0.25,
    lossProbability: Math.max(0.30 - winRate * 0.2, 0.15),
    over25Probability: 0.55,
    under25Probability: 0.45,
    bttsYesProbability: 0.50,
    bttsNoProbability: 0.50,
    reasoning: 'Statistical analysis based on historical match data',
    confidence: totalMatches >= 15 ? 'Medium' : 'Low',
  };
}
