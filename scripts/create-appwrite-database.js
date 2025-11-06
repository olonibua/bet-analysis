#!/usr/bin/env node

/**
 * Appwrite Database & Collections Creator
 *
 * This script creates the complete database structure for Sports Probability Engine
 * including all collections, attributes, and indexes.
 */

const { Client, Databases, ID, Permission, Role } = require('appwrite');
require('dotenv').config({ path: '.env.local' });

const DATABASE_ID = 'sports-probability-engine';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

// For server-side operations, we need to use a server API key
// Since we're using the public API key, we'll work within those constraints
const databases = new Databases(client);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createDatabase() {
    try {
        console.log('🏗️  Creating database:', DATABASE_ID);

        const database = await databases.create(
            DATABASE_ID,
            'Sports Probability Engine Database',
            true // enabled
        );

        console.log('✅ Database created successfully');
        return database;
    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️  Database already exists, proceeding...');
            return { $id: DATABASE_ID };
        } else {
            console.error('❌ Failed to create database:', error.message);
            throw error;
        }
    }
}

async function createEventsCollection() {
    const COLLECTION_ID = 'events';
    console.log('\n📋 Creating Events collection...');

    try {
        // Create collection
        await databases.createCollection(
            DATABASE_ID,
            COLLECTION_ID,
            'Events',
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ],
            false, // documentSecurity
            true   // enabled
        );

        console.log('✅ Events collection created');
        await delay(2000);

        // Create attributes
        const attributes = [
            { key: 'homeTeam', type: 'string', size: 100, required: true },
            { key: 'awayTeam', type: 'string', size: 100, required: true },
            { key: 'league', type: 'string', size: 100, required: true },
            { key: 'datetime', type: 'datetime', required: true },
            { key: 'venue', type: 'string', size: 200, required: false },
            { key: 'status', type: 'string', size: 20, required: true },
            { key: 'season', type: 'string', size: 20, required: true },
            { key: 'externalId', type: 'string', size: 50, required: true }
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.size,
                        attr.required
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.required
                    );
                }
                console.log(`  ✅ Added attribute: ${attr.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Attribute ${attr.key}: ${error.message}`);
            }
        }

        // Create indexes
        await delay(3000);
        const indexes = [
            { key: 'status_datetime', attributes: ['status', 'datetime'] },
            { key: 'league_idx', attributes: ['league'] },
            { key: 'external_id_idx', attributes: ['externalId'] }
        ];

        for (const index of indexes) {
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    COLLECTION_ID,
                    index.key,
                    'key',
                    index.attributes
                );
                console.log(`  ✅ Added index: ${index.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Index ${index.key}: ${error.message}`);
            }
        }

    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️  Events collection already exists');
        } else {
            console.error('❌ Failed to create Events collection:', error.message);
            throw error;
        }
    }
}

async function createMatchesCollection() {
    const COLLECTION_ID = 'matches';
    console.log('\n⚽ Creating Matches collection...');

    try {
        await databases.createCollection(
            DATABASE_ID,
            COLLECTION_ID,
            'Matches',
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ],
            false,
            true
        );

        console.log('✅ Matches collection created');
        await delay(2000);

        const attributes = [
            { key: 'eventId', type: 'string', size: 50, required: false },
            { key: 'homeTeam', type: 'string', size: 100, required: true },
            { key: 'awayTeam', type: 'string', size: 100, required: true },
            { key: 'homeScore', type: 'integer', required: true },
            { key: 'awayScore', type: 'integer', required: true },
            { key: 'date', type: 'datetime', required: true },
            { key: 'league', type: 'string', size: 100, required: true },
            { key: 'statistics', type: 'string', size: 5000, required: false }
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.size,
                        attr.required
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.required
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.required
                    );
                }
                console.log(`  ✅ Added attribute: ${attr.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Attribute ${attr.key}: ${error.message}`);
            }
        }

        await delay(3000);
        const indexes = [
            { key: 'teams_date_idx', attributes: ['homeTeam', 'awayTeam', 'date'] },
            { key: 'league_idx', attributes: ['league'] },
            { key: 'date_idx', attributes: ['date'] }
        ];

        for (const index of indexes) {
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    COLLECTION_ID,
                    index.key,
                    'key',
                    index.attributes
                );
                console.log(`  ✅ Added index: ${index.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Index ${index.key}: ${error.message}`);
            }
        }

    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️  Matches collection already exists');
        } else {
            console.error('❌ Failed to create Matches collection:', error.message);
            throw error;
        }
    }
}

async function createProbabilitiesCollection() {
    const COLLECTION_ID = 'probabilities';
    console.log('\n📊 Creating Probabilities collection...');

    try {
        await databases.createCollection(
            DATABASE_ID,
            COLLECTION_ID,
            'Probabilities',
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ],
            false,
            true
        );

        console.log('✅ Probabilities collection created');
        await delay(2000);

        const attributes = [
            { key: 'eventId', type: 'string', size: 50, required: true },
            { key: 'market', type: 'string', size: 50, required: true },
            { key: 'subMarket', type: 'string', size: 100, required: true },
            { key: 'probability', type: 'double', required: true },
            { key: 'confidence', type: 'string', size: 20, required: true },
            { key: 'sampleSize', type: 'integer', required: true },
            { key: 'lastCalculated', type: 'datetime', required: true }
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.size,
                        attr.required
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.required
                    );
                } else if (attr.type === 'double') {
                    await databases.createFloatAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.required
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        COLLECTION_ID,
                        attr.key,
                        attr.required
                    );
                }
                console.log(`  ✅ Added attribute: ${attr.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Attribute ${attr.key}: ${error.message}`);
            }
        }

        await delay(3000);
        const indexes = [
            { key: 'event_id_idx', attributes: ['eventId'] },
            { key: 'confidence_prob_idx', attributes: ['confidence', 'probability'] },
            { key: 'market_idx', attributes: ['market'] }
        ];

        for (const index of indexes) {
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    COLLECTION_ID,
                    index.key,
                    'key',
                    index.attributes
                );
                console.log(`  ✅ Added index: ${index.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Index ${index.key}: ${error.message}`);
            }
        }

    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️  Probabilities collection already exists');
        } else {
            console.error('❌ Failed to create Probabilities collection:', error.message);
            throw error;
        }
    }
}

async function createTeamsCollection() {
    const COLLECTION_ID = 'teams';
    console.log('\n🏆 Creating Teams collection...');

    try {
        await databases.createCollection(
            DATABASE_ID,
            COLLECTION_ID,
            'Teams',
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ],
            false,
            true
        );

        console.log('✅ Teams collection created');
        await delay(2000);

        const attributes = [
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'league', type: 'string', size: 100, required: true },
            { key: 'season', type: 'string', size: 20, required: true },
            { key: 'externalId', type: 'string', size: 50, required: false }
        ];

        for (const attr of attributes) {
            try {
                await databases.createStringAttribute(
                    DATABASE_ID,
                    COLLECTION_ID,
                    attr.key,
                    attr.size,
                    attr.required
                );
                console.log(`  ✅ Added attribute: ${attr.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Attribute ${attr.key}: ${error.message}`);
            }
        }

        await delay(3000);
        const indexes = [
            { key: 'name_idx', attributes: ['name'] },
            { key: 'league_idx', attributes: ['league'] }
        ];

        for (const index of indexes) {
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    COLLECTION_ID,
                    index.key,
                    'key',
                    index.attributes
                );
                console.log(`  ✅ Added index: ${index.key}`);
                await delay(1000);
            } catch (error) {
                console.log(`  ⚠️  Index ${index.key}: ${error.message}`);
            }
        }

    } catch (error) {
        if (error.code === 409) {
            console.log('ℹ️  Teams collection already exists');
        } else {
            console.error('❌ Failed to create Teams collection:', error.message);
            throw error;
        }
    }
}

async function verifySetup() {
    console.log('\n🔍 Verifying database setup...');

    try {
        const database = await databases.get(DATABASE_ID);
        console.log('✅ Database exists:', database.name);

        const collections = ['events', 'matches', 'probabilities', 'teams'];
        for (const collectionId of collections) {
            try {
                const collection = await databases.getCollection(DATABASE_ID, collectionId);
                console.log(`✅ Collection exists: ${collection.name} (${collection.total} documents)`);
            } catch (error) {
                console.log(`❌ Collection missing: ${collectionId}`);
            }
        }

        return true;
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting Appwrite Database Setup for Sports Probability Engine\n');

    try {
        // Create database
        await createDatabase();
        await delay(3000);

        // Create all collections
        await createEventsCollection();
        await delay(2000);

        await createMatchesCollection();
        await delay(2000);

        await createProbabilitiesCollection();
        await delay(2000);

        await createTeamsCollection();
        await delay(2000);

        // Verify everything was created
        const success = await verifySetup();

        if (success) {
            console.log('\n🎉 Database setup completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('1. Visit http://localhost:3004');
            console.log('2. Click "Start Data Sync"');
            console.log('3. Wait for live data to populate');
            console.log('4. Enjoy your Sports Probability Engine! 🎯');
        } else {
            console.log('\n⚠️  Setup completed with some issues. Check the logs above.');
        }

    } catch (error) {
        console.error('\n💥 Setup failed:', error.message);
        console.log('\n🛠️  Troubleshooting:');
        console.log('1. Check your Appwrite credentials in .env.local');
        console.log('2. Ensure you have proper permissions in Appwrite console');
        console.log('3. Try running the script again');
        process.exit(1);
    }
}

// Run the setup
main();