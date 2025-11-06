import { NextResponse } from 'next/server';
import { testApiConnection } from '@/lib/football-api';
import { getCrawlingStatus } from '@/lib/data-crawler';
import { getProbabilityStats } from '@/lib/probability-engine';

export async function GET() {
  try {
    // Test various system components
    const [
      apiConnection,
      crawlingStatus,
      probabilityStats
    ] = await Promise.allSettled([
      testApiConnection(),
      getCrawlingStatus(),
      getProbabilityStats()
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        footballApi: {
          status: apiConnection.status === 'fulfilled' && apiConnection.value?.success ? 'healthy' : 'unhealthy',
          details: apiConnection.status === 'rejected' ? apiConnection.reason?.message :
                   apiConnection.status === 'fulfilled' ? {
                     connection: 'successful',
                     plan: apiConnection.value?.plan || 'unknown',
                     competitions: (apiConnection.value?.details as Record<string, unknown>)?.competitions || 0,
                     rateLimit: (apiConnection.value?.details as Record<string, unknown>)?.rateLimit || 'unknown'
                   } : 'Connection failed'
        },
        database: {
          status: crawlingStatus.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          details: crawlingStatus.status === 'fulfilled' ? crawlingStatus.value : crawlingStatus.reason?.message
        },
        probabilityEngine: {
          status: probabilityStats.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          details: probabilityStats.status === 'fulfilled' ? probabilityStats.value : probabilityStats.reason?.message
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasFootballApiKey: !!process.env.FOOTBALL_DATA_API_KEY && process.env.FOOTBALL_DATA_API_KEY !== 'your_football_data_api_key_here',
        hasAppwriteConfig: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
      }
    };

    // Determine overall health status
    const components = health.components;
    const allHealthy = Object.values(components).every(c => c.status === 'healthy');

    if (!allHealthy) {
      health.status = 'degraded';
    }

    return NextResponse.json(health, {
      status: allHealthy ? 200 : 503
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}