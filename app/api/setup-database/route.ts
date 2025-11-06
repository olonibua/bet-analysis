import { NextResponse } from 'next/server';
import { setupAllCollections } from '@/lib/database-setup';

export async function POST() {
  try {
    console.log('🚀 Starting Appwrite database setup via API...');

    const result = await setupAllCollections();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Database setup completed successfully!',
        details: {
          database: 'sports-probability-engine',
          collections: ['events', 'matches', 'probabilities', 'teams'],
          nextSteps: [
            'Visit http://localhost:3004',
            'Click "Start Data Sync"',
            'Watch live data populate!'
          ]
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Database setup API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger database setup',
    endpoint: '/api/setup-database',
    method: 'POST'
  });
}