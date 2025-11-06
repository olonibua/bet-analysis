#!/usr/bin/env node

/**
 * Test script for Football-data.org API upgrade
 * This script helps verify that your paid API key is working correctly
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const BASE_URL = 'https://api.football-data.org/v4';

if (!API_KEY || API_KEY === 'your_paid_api_key_here' || API_KEY === 'your_football_data_api_key_here') {
  console.error('❌ Error: Please set your FOOTBALL_DATA_API_KEY in .env.local');
  console.log('📝 Instructions:');
  console.log('1. Copy env.template to .env.local');
  console.log('2. Update FOOTBALL_DATA_API_KEY with your paid API key');
  console.log('3. Run this script again');
  process.exit(1);
}

const footballApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Auth-Token': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

async function testApiConnection() {
  console.log('🔍 Testing Football-data.org API connection...');
  console.log(`📡 Using API Key: ${API_KEY.substring(0, 8)}...`);
  
  try {
    // Test basic connection
    const response = await footballApi.get('/competitions');
    console.log('✅ Basic connection successful');
    console.log(`📊 Available competitions: ${response.data.competitions?.length || 0}`);
    
    // Test rate limits by making multiple calls
    console.log('\n⚡ Testing rate limits...');
    const startTime = Date.now();
    
    for (let i = 0; i < 3; i++) {
      await footballApi.get('/competitions/PL/matches?limit=1');
      console.log(`   Call ${i + 1}/3 completed`);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log(`⏱️  Total time for 3 calls: ${totalTime}ms`);
    
    // Detect API plan based on features
    console.log('\n🔍 Detecting API plan...');
    let detectedPlan = 'FREE';
    
    try {
      const testResponse = await footballApi.get('/competitions/PL/matches?limit=1');
      if (testResponse.data.matches && testResponse.data.matches.length > 0) {
        const matchId = testResponse.data.matches[0].id;
        
        // Test for lineup access (Standard plan feature)
        try {
          await footballApi.get(`/matches/${matchId}/lineups`);
          detectedPlan = 'STANDARD';
          console.log('✅ Lineup access detected - Standard plan or higher');
        } catch {
          // Test for events access (Deep Data plan feature)
          try {
            await footballApi.get(`/matches/${matchId}/events`);
            detectedPlan = 'DEEP_DATA';
            console.log('✅ Events access detected - Deep Data plan or higher');
          } catch {
            detectedPlan = 'FREE';
            console.log('ℹ️  No paid features detected - Free plan');
          }
        }
      }
    } catch (error) {
      console.log('ℹ️  Could not detect plan features');
    }
    
    console.log(`\n🎯 Detected Plan: ${detectedPlan}`);
    
    // Show rate limit recommendations
    const rateLimits = {
      FREE: { callsPerMinute: 10, delayMs: 6100 },
      DEEP_DATA: { callsPerMinute: 30, delayMs: 2000 },
      STANDARD: { callsPerMinute: 60, delayMs: 1000 },
      ADVANCED: { callsPerMinute: 100, delayMs: 600 },
      PRO: { callsPerMinute: 120, delayMs: 500 },
    };
    
    const currentLimit = rateLimits[detectedPlan];
    console.log(`⚡ Recommended rate limit: ${currentLimit.callsPerMinute} calls/minute`);
    console.log(`⏱️  Recommended delay: ${currentLimit.delayMs}ms between calls`);
    
    // Performance comparison
    console.log('\n📈 Performance Comparison:');
    console.log('┌─────────────────┬──────────────┬──────────────┐');
    console.log('│ Plan            │ Calls/Min    │ Sync Time    │');
    console.log('├─────────────────┼──────────────┼──────────────┤');
    console.log('│ Free            │ 10           │ 6+ minutes   │');
    console.log('│ Deep Data (€29) │ 30           │ 2-3 minutes  │');
    console.log('│ Standard (€49)  │ 60           │ 1-2 minutes  │');
    console.log('│ Advanced (€99)  │ 100          │ 1 minute     │');
    console.log('└─────────────────┴──────────────┴──────────────┘');
    
    console.log('\n🎉 API upgrade test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Test the health endpoint: curl http://localhost:3000/api/health');
    console.log('3. Run a data sync: curl -X POST "http://localhost:3000/api/sync?action=full"');
    
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testApiConnection().catch(console.error);

