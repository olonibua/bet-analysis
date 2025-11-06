#!/usr/bin/env node

// ES Module script to setup Appwrite database using existing utilities
import { setupAllCollections } from '../lib/database-setup.js';

console.log('🚀 Starting Appwrite database setup...');
console.log('📁 Creating database and collections programmatically');
console.log('');

try {
  const result = await setupAllCollections();

  if (result.success) {
    console.log('🎉 SUCCESS! Database setup completed!');
    console.log('');
    console.log('📊 Database: sports-probability-engine');
    console.log('📁 Collections: events, matches, probabilities, teams');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Visit: http://localhost:3004');
    console.log('2. Click "Start Data Sync"');
    console.log('3. Watch live data populate!');
    process.exit(0);
  } else {
    console.error('❌ Setup failed:', result.message);
    process.exit(1);
  }
} catch (error) {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}