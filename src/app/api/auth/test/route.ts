// AUTH TEST ENDPOINT - Debug auth system
import { NextRequest, NextResponse } from 'next/server';
import { testAuthSystem, validateAuthEnvironment, requireAuth } from '@/lib/auth-ultimate';

export async function GET(request: NextRequest) {
  console.log('🧪 [AUTH-TEST] Starting comprehensive auth test');
  
  try {
    // Step 1: Environment validation
    const envCheck = validateAuthEnvironment();
    console.log('🧪 [AUTH-TEST] Environment check:', envCheck);
    
    // Step 2: Auth system test
    const authTest = await testAuthSystem();
    console.log('🧪 [AUTH-TEST] Auth system test:', authTest);
    
    // Step 3: Full auth flow test
    let fullAuthResult: any = null;
    let fullAuthError: any = null;
    
    try {
      fullAuthResult = await requireAuth();
      console.log('🧪 [AUTH-TEST] Full auth success:', {
        userId: fullAuthResult.user.id,
        email: fullAuthResult.user.email,
        profileId: fullAuthResult.profile.id
      });
    } catch (error) {
      fullAuthError = {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any).code,
        details: (error as any).details
      };
      console.log('🧪 [AUTH-TEST] Full auth failed:', fullAuthError);
    }
    
    // Step 4: Request analysis
    const requestInfo = {
      method: request.method,
      url: request.url,
      headers: {
        authorization: request.headers.get('authorization') ? 'present' : 'missing',
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        userAgent: request.headers.get('user-agent')
      },
      cookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value ? 'present' : 'missing']))
    };
    
    // Return comprehensive test results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.env.VERCEL ? 'vercel' : 'local',
        ...envCheck
      },
      tests: {
        authSystem: authTest,
        fullAuth: {
          success: !!fullAuthResult,
          result: fullAuthResult ? {
            userId: fullAuthResult.user.id,
            email: fullAuthResult.user.email,
            profileExists: !!fullAuthResult.profile
          } : null,
          error: fullAuthError
        }
      },
      request: requestInfo,
      recommendations: generateRecommendations(envCheck, authTest, fullAuthResult, fullAuthError)
    });
    
  } catch (error) {
    console.error('❌ [AUTH-TEST] Test endpoint failed:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(
  envCheck: any, 
  authTest: any, 
  fullAuthResult: any, 
  fullAuthError: any
): string[] {
  const recommendations: string[] = [];
  
  if (!envCheck.valid) {
    recommendations.push(`Missing environment variables: ${envCheck.missing.join(', ')}`);
  }
  
  if (envCheck.warnings.length > 0) {
    recommendations.push(`Environment warnings: ${envCheck.warnings.join(', ')}`);
  }
  
  if (!authTest.success) {
    recommendations.push('Auth system test failed - check Supabase configuration');
  }
  
  if (authTest.method === 'service_role') {
    recommendations.push('Using service role fallback - ensure proper auth setup for production');
  }
  
  if (!fullAuthResult && fullAuthError) {
    if (fullAuthError.code === 'AUTH_EXHAUSTED') {
      recommendations.push('All auth strategies failed - check Supabase connection and session cookies');
    } else if (fullAuthError.code === 'SESSION_ERROR') {
      recommendations.push('Session authentication failed - user may need to log in again');
    } else if (fullAuthError.code === 'PROFILE_ERROR') {
      recommendations.push('Profile creation/lookup failed - check database permissions');
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Auth system appears to be working correctly');
  }
  
  return recommendations;
}