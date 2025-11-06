/**
 * Clean Database Script
 * Removes all old/stale events, matches, and probabilities from the database
 */

const { Client, Databases, Query } = require('appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const DATABASE_ID = 'sports-probability-engine';
const COLLECTIONS = {
  EVENTS: 'events',
  MATCHES: 'matches',
  PROBABILITIES: 'probabilities',
  TEAMS: 'teams',
};

async function deleteAllDocuments(collectionId) {
  try {
    console.log(`\nCleaning ${collectionId}...`);

    let total = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(DATABASE_ID, collectionId, [
        Query.limit(25) // Delete in batches
      ]);

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const doc of response.documents) {
        await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
        total++;
        if (total % 10 === 0) {
          process.stdout.write(`\rDeleted ${total} documents...`);
        }
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✓ Deleted ${total} documents from ${collectionId}`);
    return total;
  } catch (error) {
    console.error(`Error cleaning ${collectionId}:`, error.message);
    return 0;
  }
}

async function cleanDatabase() {
  console.log('================================================');
  console.log('DATABASE CLEANUP - Removing all stale data');
  console.log('================================================');

  const stats = {
    events: 0,
    matches: 0,
    probabilities: 0,
    teams: 0
  };

  // Delete all collections with delays between them
  stats.events = await deleteAllDocuments(COLLECTIONS.EVENTS);
  await new Promise(resolve => setTimeout(resolve, 3000));

  stats.matches = await deleteAllDocuments(COLLECTIONS.MATCHES);
  await new Promise(resolve => setTimeout(resolve, 3000));

  stats.probabilities = await deleteAllDocuments(COLLECTIONS.PROBABILITIES);
  await new Promise(resolve => setTimeout(resolve, 3000));

  stats.teams = await deleteAllDocuments(COLLECTIONS.TEAMS);

  console.log('\n================================================');
  console.log('CLEANUP COMPLETE');
  console.log('================================================');
  console.log('Summary:');
  console.log(`  - Events deleted: ${stats.events}`);
  console.log(`  - Matches deleted: ${stats.matches}`);
  console.log(`  - Probabilities deleted: ${stats.probabilities}`);
  console.log(`  - Teams deleted: ${stats.teams}`);
  console.log(`  - Total deleted: ${stats.events + stats.matches + stats.probabilities + stats.teams}`);
  console.log('\nDatabase is now clean and ready for fresh data.');
}

// Run the cleanup
cleanDatabase()
  .then(() => {
    console.log('\n✓ Cleanup script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Cleanup script failed:', error);
    process.exit(1);
  });
