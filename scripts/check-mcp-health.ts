#!/usr/bin/env tsx
/**
 * Check Lift MCP server health and report status.
 * Tests both Vercel proxy and direct Supabase Edge Function endpoints.
 */
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

const VERCEL_PROXY = 'https://weighttrackerdv.vercel.app/api/lift-mcp';
const SUPABASE_DIRECT = 'https://svcjdtlmmrisrkjqdsjt.supabase.co/functions/v1/lift-mcp';

interface HealthResponse {
  ok: boolean;
  name: string;
  version?: string;
  timestamp?: string;
  checks?: Record<string, boolean | string | number>;
  writesEnabled?: boolean;
}

async function checkHealth(url: string, name: string, useAuth = false): Promise<void> {
  console.log(`\n🔍 Checking ${name}...`);
  console.log(`   URL: ${url}/health`);

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (useAuth && process.env.LIFT_MCP_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.LIFT_MCP_TOKEN}`;
    }

    const response = await fetch(`${url}/health`, { headers });
    const data = await response.json() as HealthResponse;

    if (response.ok && data.ok) {
      console.log(`   ✅ Status: Healthy (${response.status})`);
      console.log(`   📦 Version: ${data.version || 'unknown'}`);
      console.log(`   ⏰ Timestamp: ${data.timestamp || 'unknown'}`);
      console.log(`   ✍️  Writes: ${data.writesEnabled ? 'ENABLED' : 'DISABLED'}`);
      
      if (data.checks) {
        console.log(`   🔧 Checks:`);
        for (const [key, value] of Object.entries(data.checks)) {
          const icon = value === true || value === 'connected' ? '✅' : 
                      value === false ? '❌' : '⚠️';
          console.log(`      ${icon} ${key}: ${value}`);
        }
      }
    } else {
      console.log(`   ❌ Status: Unhealthy (${response.status})`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to connect`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testMcpCall(url: string, name: string): Promise<void> {
  console.log(`\n🧪 Testing MCP call to ${name}...`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (process.env.LIFT_MCP_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.LIFT_MCP_TOKEN}`;
    }

    // Test list_recent_sessions with limit=1
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'list_recent_sessions',
        arguments: { limit: 1 },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(mcpRequest),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ MCP call successful`);
      console.log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    } else {
      console.log(`   ❌ MCP call failed (${response.status})`);
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   ❌ MCP call exception`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🏋️  Lift MCP Health Check');
  console.log('='.repeat(60));

  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`   LIFT_MCP_TOKEN: ${process.env.LIFT_MCP_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`   VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);

  // Check Vercel proxy
  await checkHealth(VERCEL_PROXY, 'Vercel Proxy', false);

  // Check direct Supabase endpoint
  await checkHealth(SUPABASE_DIRECT, 'Supabase Direct', true);

  // Test actual MCP call through Vercel proxy
  await testMcpCall(VERCEL_PROXY, 'Vercel Proxy');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Health check complete');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('\n❌ Health check failed:', error);
  process.exit(1);
});
