import { serverDatabases as databases, DATABASE_ID, COLLECTIONS } from '../lib/appwrite';
import { Query } from 'appwrite';

/**
 * Script to clear all events, matches, and probabilities from the database
 */

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // 1. Delete all probabilities
    console.log('📊 Deleting probabilities...');
    const probabilities = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROBABILITIES,
      [Query.limit(500)]
    );

    for (const prob of probabilities.documents) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROBABILITIES, prob.$id);
    }
    console.log(`✅ Deleted ${probabilities.documents.length} probabilities\n`);

    // 2. Delete all events
    console.log('📅 Deleting events...');
    const events = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [Query.limit(500)]
    );

    for (const event of events.documents) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EVENTS, event.$id);
    }
    console.log(`✅ Deleted ${events.documents.length} events\n`);

    // 3. Delete all matches
    console.log('⚽ Deleting matches...');
    const matches = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MATCHES,
      [Query.limit(500)]
    );

    for (const match of matches.documents) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.MATCHES, match.$id);
    }
    console.log(`✅ Deleted ${matches.documents.length} matches\n`);

    console.log('🎉 Database cleared successfully!');
    console.log('You can now load fresh data from the UI.\n');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

clearDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
