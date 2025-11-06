#!/usr/bin/env node

/**
 * Appwrite Collections Creator - Simplified Version
 * Creates collections directly, which will auto-create the database
 */

const { Client, Databases, ID, Permission, Role } = require('appwrite');
require('dotenv').config({ path: '.env.local' });

const DATABASE_ID = 'sports-probability-engine';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createCollection(collectionId, name) {
    try {
        console.log(`\n📋 Creating ${name} collection...`);

        const collection = await databases.createCollection(
            DATABASE_ID,
            collectionId,
            name,
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ]
        );

        console.log(`✅ ${name} collection created successfully`);
        return collection;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  ${name} collection already exists`);
            return { $id: collectionId };
        } else {
            console.error(`❌ Failed to create ${name} collection:`, error.message);
            throw error;
        }
    }
}

async function addStringAttribute(collectionId, key, size, required = true) {
    try {
        await databases.createStringAttribute(DATABASE_ID, collectionId, key, size, required);
        console.log(`  ✅ Added string attribute: ${key}`);
        await delay(1000);
    } catch (error) {
        console.log(`  ⚠️  Attribute ${key}: ${error.message}`);
    }
}

async function addIntegerAttribute(collectionId, key, required = true) {
    try {
        await databases.createIntegerAttribute(DATABASE_ID, collectionId, key, required);
        console.log(`  ✅ Added integer attribute: ${key}`);
        await delay(1000);
    } catch (error) {
        console.log(`  ⚠️  Attribute ${key}: ${error.message}`);
    }
}

async function addFloatAttribute(collectionId, key, required = true) {
    try {
        await databases.createFloatAttribute(DATABASE_ID, collectionId, key, required);
        console.log(`  ✅ Added float attribute: ${key}`);
        await delay(1000);
    } catch (error) {
        console.log(`  ⚠️  Attribute ${key}: ${error.message}`);
    }
}

async function addDatetimeAttribute(collectionId, key, required = true) {
    try {
        await databases.createDatetimeAttribute(DATABASE_ID, collectionId, key, required);
        console.log(`  ✅ Added datetime attribute: ${key}`);
        await delay(1000);
    } catch (error) {
        console.log(`  ⚠️  Attribute ${key}: ${error.message}`);
    }
}

async function addIndex(collectionId, key, type, attributes) {
    try {
        await databases.createIndex(DATABASE_ID, collectionId, key, type, attributes);
        console.log(`  ✅ Added index: ${key}`);
        await delay(1000);
    } catch (error) {
        console.log(`  ⚠️  Index ${key}: ${error.message}`);
    }
}

async function setupEventsCollection() {
    await createCollection('events', 'Events');
    await delay(2000);

    // Add attributes
    await addStringAttribute('events', 'homeTeam', 100);
    await addStringAttribute('events', 'awayTeam', 100);
    await addStringAttribute('events', 'league', 100);
    await addDatetimeAttribute('events', 'datetime');
    await addStringAttribute('events', 'venue', 200, false);
    await addStringAttribute('events', 'status', 20);
    await addStringAttribute('events', 'season', 20);
    await addStringAttribute('events', 'externalId', 50);

    await delay(3000);

    // Add indexes
    await addIndex('events', 'status_datetime', 'key', ['status', 'datetime']);
    await addIndex('events', 'league_idx', 'key', ['league']);
    await addIndex('events', 'external_id_idx', 'key', ['externalId']);
}

async function setupMatchesCollection() {
    await createCollection('matches', 'Matches');
    await delay(2000);

    // Add attributes
    await addStringAttribute('matches', 'eventId', 50, false);
    await addStringAttribute('matches', 'homeTeam', 100);
    await addStringAttribute('matches', 'awayTeam', 100);
    await addIntegerAttribute('matches', 'homeScore');
    await addIntegerAttribute('matches', 'awayScore');
    await addDatetimeAttribute('matches', 'date');
    await addStringAttribute('matches', 'league', 100);
    await addStringAttribute('matches', 'statistics', 5000, false);

    await delay(3000);

    // Add indexes
    await addIndex('matches', 'teams_date_idx', 'key', ['homeTeam', 'awayTeam']);
    await addIndex('matches', 'league_idx', 'key', ['league']);
    await addIndex('matches', 'date_idx', 'key', ['date']);
}

async function setupProbabilitiesCollection() {
    await createCollection('probabilities', 'Probabilities');
    await delay(2000);

    // Add attributes
    await addStringAttribute('probabilities', 'eventId', 50);
    await addStringAttribute('probabilities', 'market', 50);
    await addStringAttribute('probabilities', 'subMarket', 100);
    await addFloatAttribute('probabilities', 'probability');
    await addStringAttribute('probabilities', 'confidence', 20);
    await addIntegerAttribute('probabilities', 'sampleSize');
    await addDatetimeAttribute('probabilities', 'lastCalculated');

    await delay(3000);

    // Add indexes
    await addIndex('probabilities', 'event_id_idx', 'key', ['eventId']);
    await addIndex('probabilities', 'confidence_idx', 'key', ['confidence']);
    await addIndex('probabilities', 'market_idx', 'key', ['market']);
}

async function setupTeamsCollection() {
    await createCollection('teams', 'Teams');
    await delay(2000);

    // Add attributes
    await addStringAttribute('teams', 'name', 100);
    await addStringAttribute('teams', 'league', 100);
    await addStringAttribute('teams', 'season', 20);
    await addStringAttribute('teams', 'externalId', 50, false);

    await delay(3000);

    // Add indexes
    await addIndex('teams', 'name_idx', 'key', ['name']);
    await addIndex('teams', 'league_idx', 'key', ['league']);
}

async function verifySetup() {
    console.log('\n🔍 Verifying setup...');

    try {
        const collections = ['events', 'matches', 'probabilities', 'teams'];
        for (const collectionId of collections) {
            const collection = await databases.getCollection(DATABASE_ID, collectionId);
            console.log(`✅ Collection verified: ${collection.name}`);
        }
        return true;
    } catch (error) {
        console.log('❌ Verification failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Initializing Appwrite Database for Sports Probability Engine\n');

    try {
        // Setup all collections
        await setupEventsCollection();
        await setupMatchesCollection();
        await setupProbabilitiesCollection();
        await setupTeamsCollection();

        // Verify setup
        const success = await verifySetup();

        if (success) {
            console.log('\n🎉 Database initialization completed successfully!');
            console.log('\n📋 Ready for data sync!');
            console.log('1. Visit http://localhost:3004');
            console.log('2. Click "Start Data Sync"');
            console.log('3. Watch live data populate! 🎯');
        } else {
            console.log('\n⚠️  Setup completed with some issues.');
        }

    } catch (error) {
        console.error('\n💥 Initialization failed:', error.message);
        console.log('\nThis might be due to permissions. You can also:');
        console.log('1. Create the database manually in Appwrite console');
        console.log('2. Run data sync - collections will be created automatically');
        process.exit(1);
    }
}

main();