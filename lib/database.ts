import { ID, Query } from 'appwrite';
import { serverDatabases as databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Event, Match, Probability, Team, EventWithProbabilities } from './types';
import { databaseRateLimiter, withRetry } from './rate-limiter';

// Event operations
export const createEvent = async (eventData: Omit<Event, '$id' | '$createdAt' | '$updatedAt'>) => {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      ID.unique(),
      eventData
    );
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

export const getUpcomingEvents = async (limit: number = 50): Promise<Event[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [
        Query.equal('status', 'upcoming'),
        Query.orderAsc('datetime'),
        Query.limit(limit)
      ]
    );
    return response.documents as unknown as Event[];
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    throw error;
  }
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const event = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId
    );
    return event as unknown as Event;
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
};

export const getEventsByLeague = async (league: string, limit: number = 50): Promise<Event[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [
        Query.equal('league', league),
        Query.equal('status', 'upcoming'),
        Query.orderAsc('datetime'),
        Query.limit(limit)
      ]
    );
    return response.documents as unknown as Event[];
  } catch (error) {
    console.error('Error fetching events by league:', error);
    throw error;
  }
};

// Match operations (historical data)
export const createMatch = async (matchData: Omit<Match, '$id' | '$createdAt' | '$updatedAt'>) => {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MATCHES,
      ID.unique(),
      matchData
    );
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
};

export const getHistoricalMatches = async (
  homeTeam: string,
  awayTeam: string,
  limit: number = 20
): Promise<Match[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MATCHES,
      [
        Query.or([
          Query.and([
            Query.equal('homeTeam', homeTeam),
            Query.equal('awayTeam', awayTeam)
          ]),
          Query.and([
            Query.equal('homeTeam', awayTeam),
            Query.equal('awayTeam', homeTeam)
          ])
        ]),
        Query.orderDesc('date'),
        Query.limit(limit)
      ]
    );
    return response.documents as unknown as Match[];
  } catch (error) {
    console.error('Error fetching historical matches:', error);
    throw error;
  }
};

export const getTeamMatches = async (teamName: string, limit: number = 20): Promise<Match[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MATCHES,
      [
        Query.or([
          Query.equal('homeTeam', teamName),
          Query.equal('awayTeam', teamName)
        ]),
        Query.orderDesc('date'),
        Query.limit(limit)
      ]
    );
    return response.documents as unknown as Match[];
  } catch (error) {
    console.error('Error fetching team matches:', error);
    throw error;
  }
};

// Probability operations
export const createProbability = async (probData: Omit<Probability, '$id' | '$createdAt' | '$updatedAt'>) => {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROBABILITIES,
      ID.unique(),
      probData
    );
  } catch (error) {
    console.error('Error creating probability:', error);
    throw error;
  }
};

export const getProbabilitiesByEvent = async (eventId: string): Promise<Probability[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROBABILITIES,
      [
        Query.equal('eventId', eventId),
        Query.orderDesc('probability')
      ]
    );
    return response.documents as unknown as Probability[];
  } catch (error) {
    console.error('Error fetching probabilities:', error);
    throw error;
  }
};

export const getHighConfidenceProbabilities = async (
  minProbability: number = 0.65,
  limit: number = 50
): Promise<Probability[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROBABILITIES,
      [
        Query.greaterThanEqual('probability', minProbability),
        Query.equal('confidence', ['High', 'Medium']),
        Query.orderDesc('probability'),
        Query.limit(limit)
      ]
    );
    return response.documents as unknown as Probability[];
  } catch (error) {
    console.error('Error fetching high confidence probabilities:', error);
    throw error;
  }
};

// Combined operations
export const getEventsWithProbabilities = async (limit: number = 20): Promise<EventWithProbabilities[]> => {
  try {
    const events = await getUpcomingEvents(limit);
    const eventsWithProbs: EventWithProbabilities[] = [];

    for (const event of events) {
      const probabilities = await getProbabilitiesByEvent(event.$id);
      // Show ALL probabilities (11 options), sorted by probability descending
      const topProbabilities = probabilities.sort((a, b) => b.probability - a.probability);

      eventsWithProbs.push({
        ...event,
        probabilities,
        topProbabilities
      });
    }

    return eventsWithProbs;
  } catch (error) {
    console.error('Error fetching events with probabilities:', error);
    throw error;
  }
};

// Team operations
export const createTeam = async (teamData: Omit<Team, '$id' | '$createdAt' | '$updatedAt'>) => {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.TEAMS,
      ID.unique(),
      teamData
    );
  } catch (error) {
    console.error('Error creating team:', error);
    throw error;
  }
};

export const getTeamByName = async (name: string): Promise<Team | null> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TEAMS,
      [Query.equal('name', name), Query.limit(1)]
    );
    return response.documents.length > 0 ? response.documents[0] as unknown as Team : null;
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
};

// Utility functions
export const updateEventStatus = async (eventId: string, status: Event['status']) => {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
      { status }
    );
  } catch (error) {
    console.error('Error updating event status:', error);
    throw error;
  }
};

export const deleteProbabilitiesByEvent = async (eventId: string) => {
  try {
    const probabilities = await getProbabilitiesByEvent(eventId);

    // Delete probabilities sequentially with rate limiting (not in parallel)
    for (const prob of probabilities) {
      try {
        await databaseRateLimiter.waitIfNeeded();
        await withRetry(() =>
          databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROBABILITIES, prob.$id)
        );
      } catch (error) {
        console.error(`Error deleting probability ${prob.$id}:`, error);
        // Continue with next deletion instead of failing
      }
    }
  } catch (error) {
    console.error('Error deleting probabilities:', error);
    throw error;
  }
};