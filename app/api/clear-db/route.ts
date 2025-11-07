import { NextResponse } from 'next/server';
import { serverDatabases as databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';

/**
 * API endpoint to clear all database data
 * WARNING: This deletes all events, matches, and probabilities!
 */

export async function POST() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    let totalDeleted = 0;

    // 1. Delete all probabilities
    console.log('📊 Deleting probabilities...');
    const probabilities = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROBABILITIES,
      [Query.limit(500)]
    );

    for (let i = 0; i < probabilities.documents.length; i++) {
      const prob = probabilities.documents[i];
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROBABILITIES, prob.$id);
      totalDeleted++;
      // Rate limit: Wait 100ms between deletes
      if (i < probabilities.documents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    console.log(`✅ Deleted ${probabilities.documents.length} probabilities\n`);

    // 2. Delete all events
    console.log('📅 Deleting events...');
    const events = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [Query.limit(500)]
    );

    for (let i = 0; i < events.documents.length; i++) {
      const event = events.documents[i];
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EVENTS, event.$id);
      totalDeleted++;
      // Rate limit: Wait 100ms between deletes
      if (i < events.documents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    console.log(`✅ Deleted ${events.documents.length} events\n`);

    // 3. Delete all matches
    console.log('⚽ Deleting matches...');
    const matches = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MATCHES,
      [Query.limit(500)]
    );

    for (let i = 0; i < matches.documents.length; i++) {
      const match = matches.documents[i];
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.MATCHES, match.$id);
      totalDeleted++;
      // Rate limit: Wait 100ms between deletes
      if (i < matches.documents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    console.log(`✅ Deleted ${matches.documents.length} matches\n`);

    console.log('🎉 Database cleared successfully!');

    return NextResponse.json({
      success: true,
      deleted: {
        probabilities: probabilities.documents.length,
        events: events.documents.length,
        matches: matches.documents.length,
        total: totalDeleted,
      },
      message: 'Database cleared successfully',
    });

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
