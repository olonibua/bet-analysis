import { NextResponse } from 'next/server';

export async function GET() {
  const setupInstructions = {
    status: 'setup_required',
    message: 'Database collections need to be created manually',
    instructions: {
      title: 'Appwrite Database Setup Required',
      description: 'Please create the database and collections manually in the Appwrite console',
      steps: [
        {
          step: 1,
          title: 'Access Appwrite Console',
          action: 'Go to https://fra.cloud.appwrite.io/console',
          details: 'Login and select your "sport" project'
        },
        {
          step: 2,
          title: 'Create Database',
          action: 'Navigate to Databases → Create Database',
          details: {
            'Database ID': 'sports-probability-engine',
            'Name': 'Sports Probability Engine Database'
          }
        },
        {
          step: 3,
          title: 'Create Collections',
          action: 'Create 4 collections with the following specifications',
          collections: [
            {
              id: 'events',
              name: 'Events',
              attributes: [
                { key: 'homeTeam', type: 'String', size: 100, required: true },
                { key: 'awayTeam', type: 'String', size: 100, required: true },
                { key: 'league', type: 'String', size: 100, required: true },
                { key: 'datetime', type: 'DateTime', required: true },
                { key: 'venue', type: 'String', size: 200, required: false },
                { key: 'status', type: 'String', size: 20, required: true },
                { key: 'season', type: 'String', size: 20, required: true },
                { key: 'externalId', type: 'String', size: 50, required: true }
              ]
            },
            {
              id: 'matches',
              name: 'Matches',
              attributes: [
                { key: 'eventId', type: 'String', size: 50, required: false },
                { key: 'homeTeam', type: 'String', size: 100, required: true },
                { key: 'awayTeam', type: 'String', size: 100, required: true },
                { key: 'homeScore', type: 'Integer', required: true },
                { key: 'awayScore', type: 'Integer', required: true },
                { key: 'date', type: 'DateTime', required: true },
                { key: 'league', type: 'String', size: 100, required: true },
                { key: 'statistics', type: 'String', size: 5000, required: false }
              ]
            },
            {
              id: 'probabilities',
              name: 'Probabilities',
              attributes: [
                { key: 'eventId', type: 'String', size: 50, required: true },
                { key: 'market', type: 'String', size: 50, required: true },
                { key: 'subMarket', type: 'String', size: 100, required: true },
                { key: 'probability', type: 'Float', required: true },
                { key: 'confidence', type: 'String', size: 20, required: true },
                { key: 'sampleSize', type: 'Integer', required: true },
                { key: 'lastCalculated', type: 'DateTime', required: true }
              ]
            },
            {
              id: 'teams',
              name: 'Teams',
              attributes: [
                { key: 'name', type: 'String', size: 100, required: true },
                { key: 'league', type: 'String', size: 100, required: true },
                { key: 'season', type: 'String', size: 20, required: true },
                { key: 'externalId', type: 'String', size: 50, required: false }
              ]
            }
          ]
        },
        {
          step: 4,
          title: 'Verify Setup',
          action: 'Check that all collections are created',
          verification: 'You should see 4 collections in your database'
        },
        {
          step: 5,
          title: 'Run Data Sync',
          action: 'Return to the application and click "Start Data Sync"',
          note: 'The sync will now work with the created database structure'
        }
      ]
    },
    quickAccess: {
      appwriteConsole: 'https://fra.cloud.appwrite.io/console',
      application: 'http://localhost:3004',
      documentation: '/DATABASE_SETUP.md'
    },
    estimatedTime: '5-10 minutes'
  };

  return NextResponse.json(setupInstructions);
}