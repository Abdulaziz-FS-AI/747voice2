import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { vapiClient } from '@/lib/vapi';

interface SystemCheckResult {
  component: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  details?: any;
}

export async function GET(request: NextRequest) {
  const results: SystemCheckResult[] = [];
  const supabase = createServiceRoleClient();

  console.log('[System Check] Starting comprehensive system audit...');

  // 1. Environment Variables Check
  try {
    const envCheck = {
      VAPI_API_KEY: !!process.env.VAPI_API_KEY,
      VAPI_WEBHOOK_SECRET: !!process.env.VAPI_WEBHOOK_SECRET,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      MAKE_WEBHOOK_URL: !!process.env.MAKE_WEBHOOK_URL,
      MAKE_WEBHOOK_SECRET: !!process.env.MAKE_WEBHOOK_SECRET,
    };

    const missingEnvVars = Object.entries(envCheck)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    results.push({
      component: 'Environment Variables',
      status: missingEnvVars.length === 0 ? 'ok' : 'error',
      message: missingEnvVars.length === 0 
        ? 'All required environment variables are set'
        : `Missing environment variables: ${missingEnvVars.join(', ')}`,
      details: envCheck
    });
  } catch (error) {
    results.push({
      component: 'Environment Variables',
      status: 'error',
      message: 'Failed to check environment variables',
      details: error
    });
  }

  // 2. Database Tables Check
  try {
    const tables = [
      'user_assistants',
      'user_phone_numbers',
      'templates',
      'structured_questions',
      'profiles',
      'call_logs',
      'call_analytics'
    ];

    const tableChecks = await Promise.all(
      tables.map(async (table) => {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          return {
            table,
            exists: !error,
            error: error?.message,
            count
          };
        } catch (err) {
          return {
            table,
            exists: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
      })
    );

    const missingTables = tableChecks.filter(t => !t.exists);
    
    results.push({
      component: 'Database Tables',
      status: missingTables.length === 0 ? 'ok' : 'error',
      message: missingTables.length === 0
        ? 'All required tables exist'
        : `Missing tables: ${missingTables.map(t => t.table).join(', ')}`,
      details: tableChecks
    });
  } catch (error) {
    results.push({
      component: 'Database Tables',
      status: 'error',
      message: 'Failed to check database tables',
      details: error
    });
  }

  // 3. VAPI Connection Check
  try {
    if (vapiClient) {
      // Try to list assistants to verify VAPI connection
      const testResponse = await fetch('https://api.vapi.ai/assistant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      results.push({
        component: 'VAPI Connection',
        status: testResponse.ok ? 'ok' : 'error',
        message: testResponse.ok 
          ? 'VAPI API connection successful'
          : `VAPI API error: ${testResponse.status} ${testResponse.statusText}`,
        details: {
          status: testResponse.status,
          statusText: testResponse.statusText
        }
      });
    } else {
      results.push({
        component: 'VAPI Connection',
        status: 'error',
        message: 'VAPI client not initialized',
        details: { vapiClient: null }
      });
    }
  } catch (error) {
    results.push({
      component: 'VAPI Connection',
      status: 'error',
      message: 'Failed to connect to VAPI',
      details: error
    });
  }

  // 4. Check user_assistants table structure
  try {
    const { data: sampleAssistant } = await supabase
      .from('user_assistants')
      .select('*')
      .limit(1)
      .single();

    if (sampleAssistant) {
      const expectedFields = ['id', 'user_id', 'name', 'vapi_assistant_id', 'config', 'template_id'];
      const actualFields = Object.keys(sampleAssistant);
      const missingFields = expectedFields.filter(f => !actualFields.includes(f));

      results.push({
        component: 'user_assistants Schema',
        status: missingFields.length === 0 ? 'ok' : 'warning',
        message: missingFields.length === 0
          ? 'Schema matches expected structure'
          : `Missing fields: ${missingFields.join(', ')}`,
        details: {
          expectedFields,
          actualFields,
          sampleRecord: sampleAssistant
        }
      });
    } else {
      results.push({
        component: 'user_assistants Schema',
        status: 'warning',
        message: 'No assistants found to verify schema',
        details: null
      });
    }
  } catch (error) {
    results.push({
      component: 'user_assistants Schema',
      status: 'warning',
      message: 'Could not verify schema',
      details: error
    });
  }

  // 5. Check templates integration
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, name, base_prompt, customizable_fields')
      .eq('is_active', true);

    results.push({
      component: 'Templates',
      status: error ? 'error' : 'ok',
      message: error 
        ? `Template error: ${error.message}`
        : `Found ${templates?.length || 0} active templates`,
      details: {
        templates: templates?.map(t => ({ id: t.id, name: t.name })),
        error
      }
    });
  } catch (error) {
    results.push({
      component: 'Templates',
      status: 'error',
      message: 'Failed to check templates',
      details: error
    });
  }

  // 6. Check Make.com webhook
  try {
    if (process.env.MAKE_WEBHOOK_URL) {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'voice-matrix-system-check'
      };

      const makeResponse = await fetch(process.env.MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAKE_WEBHOOK_SECRET}`
        },
        body: JSON.stringify(testPayload)
      });

      results.push({
        component: 'Make.com Webhook',
        status: makeResponse.ok ? 'ok' : 'warning',
        message: makeResponse.ok
          ? 'Make.com webhook accessible'
          : `Make.com webhook returned ${makeResponse.status}`,
        details: {
          url: process.env.MAKE_WEBHOOK_URL.substring(0, 40) + '...',
          status: makeResponse.status
        }
      });
    } else {
      results.push({
        component: 'Make.com Webhook',
        status: 'warning',
        message: 'Make.com webhook URL not configured',
        details: null
      });
    }
  } catch (error) {
    results.push({
      component: 'Make.com Webhook',
      status: 'warning',
      message: 'Could not test Make.com webhook',
      details: error
    });
  }

  // 7. Summary
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const okCount = results.filter(r => r.status === 'ok').length;

  const overallStatus = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok';
  const overallMessage = errorCount > 0 
    ? `System has ${errorCount} errors that need attention`
    : warningCount > 0
    ? `System is operational with ${warningCount} warnings`
    : 'All systems operational';

  return NextResponse.json({
    success: true,
    status: overallStatus,
    message: overallMessage,
    summary: {
      total: results.length,
      ok: okCount,
      warnings: warningCount,
      errors: errorCount
    },
    results,
    timestamp: new Date().toISOString()
  });
}