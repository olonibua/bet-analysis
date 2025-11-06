import { Client, Databases, Account, Storage, Functions } from 'appwrite';

// Client-side configuration
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const databases = new Databases(client);
export const account = new Account(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { client };

// Server-side configuration for API routes
// Note: The client-side SDK doesn't support setKey, so we use the same client
// but ensure operations are called from server-side API routes with proper permissions
export const serverDatabases = databases;
export const serverAccount = account;
export const serverStorage = storage;
export const serverFunctions = functions;

// Database and Collection IDs
export const DATABASE_ID = 'sports-probability-engine';
export const COLLECTIONS = {
  EVENTS: 'events',
  MATCHES: 'matches',
  PROBABILITIES: 'probabilities',
  TEAMS: 'teams',
} as const;