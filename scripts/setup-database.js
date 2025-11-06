#!/usr/bin/env node

/**
 * Appwrite Database Setup Script
 *
 * This script creates the necessary database and collections for the Sports Probability Engine.
 * Run this once before starting data sync.
 */

const { Client, Databases, ID } = require('appwrite');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

// Set API key for server-side operations
if (process.env.NEXT_PUBLIC_APPWRITE_API_KEY) {
  try {
    client.setKey(process.env.NEXT_PUBLIC_APPWRITE_API_KEY);
  } catch (error) {
    console.log('Note: Using client without API key. Some operations might require manual setup.');
  }
}

const databases = new Databases(client);

const DATABASE_ID = 'sports-probability-engine';

const collections = {
  EVENTS: {
    id: 'events',
    name: 'Events',
    attributes: [
      { key: 'homeTeam', type: 'string', size: 100, required: true },
      { key: 'awayTeam', type: 'string', size: 100, required: true },
      { key: 'league', type: 'string', size: 100, required: true },
      { key: 'datetime', type: 'datetime', required: true },
      { key: 'venue', type: 'string', size: 200, required: false },
      { key: 'status', type: 'enum', elements: ['upcoming', 'live', 'finished'], required: true },
      { key: 'season', type: 'string', size: 20, required: true },
      { key: 'externalId', type: 'string', size: 50, required: true }
    ],
    indexes: [
      { key: 'status_datetime', type: 'key', attributes: ['status', 'datetime'] },
      { key: 'league', type: 'key', attributes: ['league'] },
      { key: 'externalId', type: 'unique', attributes: ['externalId'] }
    ]
  },
  MATCHES: {
    id: 'matches',
    name: 'Matches',
    attributes: [
      { key: 'eventId', type: 'string', size: 50, required: false },
      { key: 'homeTeam', type: 'string', size: 100, required: true },
      { key: 'awayTeam', type: 'string', size: 100, required: true },
      { key: 'homeScore', type: 'integer', required: true },
      { key: 'awayScore', type: 'integer', required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'league', type: 'string', size: 100, required: true },
      { key: 'statistics', type: 'string', size: 2000, required: false } // JSON string
    ],
    indexes: [
      { key: 'teams_date', type: 'key', attributes: ['homeTeam', 'awayTeam', 'date'] },
      { key: 'league', type: 'key', attributes: ['league'] },
      { key: 'date', type: 'key', attributes: ['date'] }
    ]
  },
  PROBABILITIES: {
    id: 'probabilities',
    name: 'Probabilities',
    attributes: [
      { key: 'eventId', type: 'string', size: 50, required: true },
      { key: 'market', type: 'string', size: 50, required: true },
      { key: 'subMarket', type: 'string', size: 100, required: true },
      { key: 'probability', type: 'double', required: true },
      { key: 'confidence', type: 'enum', elements: ['High', 'Medium', 'Low'], required: true },
      { key: 'sampleSize', type: 'integer', required: true },
      { key: 'lastCalculated', type: 'datetime', required: true }
    ],
    indexes: [
      { key: 'eventId', type: 'key', attributes: ['eventId'] },
      { key: 'confidence_probability', type: 'key', attributes: ['confidence', 'probability'] },
      { key: 'market', type: 'key', attributes: ['market'] }
    ]
  },
  TEAMS: {
    id: 'teams',
    name: 'Teams',
    attributes: [
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'league', type: 'string', size: 100, required: true },
      { key: 'season', type: 'string', size: 20, required: true },
      { key: 'externalId', type: 'string', size: 50, required: false }
    ],
    indexes: [
      { key: 'name', type: 'unique', attributes: ['name'] },
      { key: 'league', type: 'key', attributes: ['league'] }
    ]
  }
};

async function createDatabase() {
  try {
    console.log('Creating database:', DATABASE_ID);
    await databases.create(DATABASE_ID, 'Sports Probability Engine');
    console.log('✅ Database created successfully');
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Database already exists');
    } else {
      console.error('❌ Error creating database:', error.message);
      throw error;
    }
  }
}

async function createCollection(collectionConfig) {
  try {
    console.log(`Creating collection: ${collectionConfig.name}`);

    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      collectionConfig.id,
      collectionConfig.name
    );

    // Add attributes
    for (const attr of collectionConfig.attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            collectionConfig.id,
            attr.key,
            attr.size,
            attr.required,
            attr.default
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            collectionConfig.id,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default
          );
        } else if (attr.type === 'double') {
          await databases.createFloatAttribute(
            DATABASE_ID,
            collectionConfig.id,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            collectionConfig.id,
            attr.key,
            attr.required,
            attr.default
          );
        } else if (attr.type === 'enum') {
          await databases.createEnumAttribute(
            DATABASE_ID,
            collectionConfig.id,
            attr.key,
            attr.elements,
            attr.required,
            attr.default
          );
        }

        console.log(`  ✅ Added attribute: ${attr.key}`);
      } catch (attrError) {
        console.log(`  ⚠️  Attribute ${attr.key} might already exist`);
      }
    }

    // Add indexes
    for (const index of collectionConfig.indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          collectionConfig.id,
          index.key,
          index.type,
          index.attributes
        );
        console.log(`  ✅ Added index: ${index.key}`);
      } catch (indexError) {
        console.log(`  ⚠️  Index ${index.key} might already exist`);
      }
    }

    console.log(`✅ Collection ${collectionConfig.name} created successfully\n`);

  } catch (error) {
    if (error.code === 409) {
      console.log(`ℹ️  Collection ${collectionConfig.name} already exists\n`);
    } else {
      console.error(`❌ Error creating collection ${collectionConfig.name}:`, error.message);
      throw error;
    }
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up Sports Probability Engine database...\n');

  try {
    // Create database
    await createDatabase();

    // Wait a moment for database to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create collections
    for (const [key, config] of Object.entries(collections)) {
      await createCollection(config);
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Visit: http://localhost:3000');
    console.log('3. Click "Start Data Sync" to populate with live data');

  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupDatabase();