import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { vapiClient } from '@/lib/vapi';

export async function GET(request: NextRequest) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      api: { status: 'healthy', message: 'API is running' },
      database: { status: 'unknown', message: 'Not checked' },
      vapi: { status: 'unknown', message: 'Not checked' },
      environment: { status: 'unknown', message: 'Not checked' }
    }
  };

  // Check environment variables
  try {
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VAPI_API_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length === 0) {
      checks.services.environment = { 
        status: 'healthy', 
        message: 'All required environment variables are set' 
      };
    } else {
      checks.services.environment = { 
        status: 'unhealthy', 
        message: `Missing environment variables: ${missingEnvVars.join(', ')}` 
      };
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.services.environment = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
    checks.status = 'unhealthy';
  }

  // Check database connection
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      throw error;
    }
    
    checks.services.database = { 
      status: 'healthy', 
      message: 'Database connection successful' 
    };
  } catch (error) {
    checks.services.database = { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    };
    checks.status = 'unhealthy';
  }

  // Check VAPI connection
  try {
    if (vapiClient) {
      // Try to list assistants with limit 1 to test API
      await vapiClient.listAssistants();
      checks.services.vapi = { 
        status: 'healthy', 
        message: 'VAPI connection successful' 
      };
    } else {
      checks.services.vapi = { 
        status: 'degraded', 
        message: 'VAPI client not configured (API key missing)' 
      };
      if (checks.status === 'healthy') {
        checks.status = 'degraded';
      }
    }
  } catch (error) {
    checks.services.vapi = { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'VAPI connection failed' 
    };
    if (checks.status === 'healthy') {
      checks.status = 'degraded';
    }
  }

  // Return appropriate status code
  const statusCode = checks.status === 'healthy' ? 200 : 
                     checks.status === 'degraded' ? 207 : 503;

  return NextResponse.json(checks, { status: statusCode });
}