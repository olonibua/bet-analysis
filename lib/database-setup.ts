import { ID, Permission, Role } from 'appwrite';
import { serverDatabases as databases, DATABASE_ID, COLLECTIONS } from './appwrite';

// Function to check if database exists by trying to create a collection
export const ensureDatabaseExists = async (): Promise<boolean> => {
  try {
    // Try to list collections to see if database exists
    await databases.listCollections(DATABASE_ID);
    console.log('Database exists');
    return true;
  } catch (error: any) {
    if (error.code === 404 || error.message.includes('Database not found')) {
      console.log('Database not found, will be created with first collection');
      return false;
    }
    console.error('Error checking database:', error);
    // If we can't determine, assume it doesn't exist and try to create
    return false;
  }
};

// Function to create a collection with error handling
const createCollectionSafely = async (
  collectionId: string,
  name: string,
  permissions: string[] = [
    Permission.read(Role.any()),
    Permission.write(Role.any()),
    Permission.create(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.any())
  ]
) => {
  try {
    const collection = await databases.createCollection(
      DATABASE_ID,
      collectionId,
      name,
      permissions
    );
    console.log(`✅ Created collection: ${name}`);
    return collection;
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`ℹ️  Collection ${name} already exists`);
      return await databases.getCollection(DATABASE_ID, collectionId);
    }
    console.error(`❌ Failed to create collection ${name}:`, error);
    throw error;
  }
};

// Function to add string attribute safely
const addStringAttributeSafely = async (
  collectionId: string,
  key: string,
  size: number,
  required: boolean = true
) => {
  try {
    await databases.createStringAttribute(DATABASE_ID, collectionId, key, size, required);
    console.log(`  ✅ Added string attribute: ${key}`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`  ℹ️  Attribute ${key} already exists`);
    } else {
      console.log(`  ⚠️  Failed to add attribute ${key}: ${error.message}`);
    }
  }
};

// Function to add integer attribute safely
const addIntegerAttributeSafely = async (
  collectionId: string,
  key: string,
  required: boolean = true
) => {
  try {
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, key, required);
    console.log(`  ✅ Added integer attribute: ${key}`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`  ℹ️  Attribute ${key} already exists`);
    } else {
      console.log(`  ⚠️  Failed to add attribute ${key}: ${error.message}`);
    }
  }
};

// Function to add float attribute safely
const addFloatAttributeSafely = async (
  collectionId: string,
  key: string,
  required: boolean = true
) => {
  try {
    await databases.createFloatAttribute(DATABASE_ID, collectionId, key, required);
    console.log(`  ✅ Added float attribute: ${key}`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`  ℹ️  Attribute ${key} already exists`);
    } else {
      console.log(`  ⚠️  Failed to add attribute ${key}: ${error.message}`);
    }
  }
};

// Function to add datetime attribute safely
const addDatetimeAttributeSafely = async (
  collectionId: string,
  key: string,
  required: boolean = true
) => {
  try {
    await databases.createDatetimeAttribute(DATABASE_ID, collectionId, key, required);
    console.log(`  ✅ Added datetime attribute: ${key}`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`  ℹ️  Attribute ${key} already exists`);
    } else {
      console.log(`  ⚠️  Failed to add attribute ${key}: ${error.message}`);
    }
  }
};

// Function to add index safely
const addIndexSafely = async (
  collectionId: string,
  key: string,
  type: string,
  attributes: string[]
) => {
  try {
    await databases.createIndex(DATABASE_ID, collectionId, key, type, attributes);
    console.log(`  ✅ Added index: ${key}`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`  ℹ️  Index ${key} already exists`);
    } else {
      console.log(`  ⚠️  Failed to add index ${key}: ${error.message}`);
    }
  }
};

// Delay function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create Events collection
export const setupEventsCollection = async () => {
  console.log('🏗️  Setting up Events collection...');

  await createCollectionSafely(COLLECTIONS.EVENTS, 'Events');
  await delay(2000);

  // Add attributes
  await addStringAttributeSafely(COLLECTIONS.EVENTS, 'homeTeam', 100);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.EVENTS, 'awayTeam', 100);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.EVENTS, 'league', 100);
  await delay(1000);
  await addDatetimeAttributeSafely(COLLECTIONS.EVENTS, 'datetime');
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.EVENTS, 'venue', 200, false);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.EVENTS, 'status', 20);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.EVENTS, 'season', 20);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.EVENTS, 'externalId', 50);
  await delay(3000);

  // Add indexes
  await addIndexSafely(COLLECTIONS.EVENTS, 'status_datetime', 'key', ['status', 'datetime']);
  await delay(1000);
  await addIndexSafely(COLLECTIONS.EVENTS, 'league_idx', 'key', ['league']);
  await delay(1000);
  await addIndexSafely(COLLECTIONS.EVENTS, 'external_id_idx', 'key', ['externalId']);
};

// Create Matches collection
export const setupMatchesCollection = async () => {
  console.log('🏗️  Setting up Matches collection...');

  await createCollectionSafely(COLLECTIONS.MATCHES, 'Matches');
  await delay(2000);

  // Add attributes
  await addStringAttributeSafely(COLLECTIONS.MATCHES, 'eventId', 50, false);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.MATCHES, 'homeTeam', 100);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.MATCHES, 'awayTeam', 100);
  await delay(1000);
  await addIntegerAttributeSafely(COLLECTIONS.MATCHES, 'homeScore');
  await delay(1000);
  await addIntegerAttributeSafely(COLLECTIONS.MATCHES, 'awayScore');
  await delay(1000);
  await addDatetimeAttributeSafely(COLLECTIONS.MATCHES, 'date');
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.MATCHES, 'league', 100);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.MATCHES, 'statistics', 5000, false);
  await delay(3000);

  // Add indexes
  await addIndexSafely(COLLECTIONS.MATCHES, 'teams_date_idx', 'key', ['homeTeam', 'awayTeam']);
  await delay(1000);
  await addIndexSafely(COLLECTIONS.MATCHES, 'league_idx', 'key', ['league']);
  await delay(1000);
  await addIndexSafely(COLLECTIONS.MATCHES, 'date_idx', 'key', ['date']);
};

// Create Probabilities collection
export const setupProbabilitiesCollection = async () => {
  console.log('🏗️  Setting up Probabilities collection...');

  await createCollectionSafely(COLLECTIONS.PROBABILITIES, 'Probabilities');
  await delay(2000);

  // Add attributes
  await addStringAttributeSafely(COLLECTIONS.PROBABILITIES, 'eventId', 50);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.PROBABILITIES, 'market', 50);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.PROBABILITIES, 'subMarket', 100);
  await delay(1000);
  await addFloatAttributeSafely(COLLECTIONS.PROBABILITIES, 'probability');
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.PROBABILITIES, 'confidence', 20);
  await delay(1000);
  await addIntegerAttributeSafely(COLLECTIONS.PROBABILITIES, 'sampleSize');
  await delay(1000);
  await addDatetimeAttributeSafely(COLLECTIONS.PROBABILITIES, 'lastCalculated');
  await delay(3000);

  // Add indexes
  await addIndexSafely(COLLECTIONS.PROBABILITIES, 'event_id_idx', 'key', ['eventId']);
  await delay(1000);
  await addIndexSafely(COLLECTIONS.PROBABILITIES, 'confidence_idx', 'key', ['confidence']);
  await delay(1000);
  await addIndexSafely(COLLECTIONS.PROBABILITIES, 'market_idx', 'key', ['market']);
};

// Create Teams collection
export const setupTeamsCollection = async () => {
  console.log('🏗️  Setting up Teams collection...');

  await createCollectionSafely(COLLECTIONS.TEAMS, 'Teams');
  await delay(2000);

  // Add attributes
  await addStringAttributeSafely(COLLECTIONS.TEAMS, 'name', 100);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.TEAMS, 'league', 100);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.TEAMS, 'season', 20);
  await delay(1000);
  await addStringAttributeSafely(COLLECTIONS.TEAMS, 'externalId', 50, false);
  await delay(3000);

  // Add indexes
  await addIndexSafely(COLLECTIONS.TEAMS, 'name_idx', 'key', ['name']);
  await delay(1000);
  await addIndexSafely(COLLECTIONS.TEAMS, 'league_idx', 'key', ['league']);
};

// Main setup function
export const setupAllCollections = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🚀 Starting automatic database setup...');

    await setupEventsCollection();
    await setupMatchesCollection();
    await setupProbabilitiesCollection();
    await setupTeamsCollection();

    console.log('✅ Database setup completed successfully!');
    return { success: true, message: 'Database and all collections created successfully' };
  } catch (error: any) {
    console.error('❌ Database setup failed:', error);
    return { success: false, message: `Setup failed: ${error.message}` };
  }
};