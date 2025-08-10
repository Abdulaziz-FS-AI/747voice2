import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.VAPI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'VAPI_API_KEY not found in environment variables'
      });
    }

    console.log('Testing VAPI API key...');
    console.log('API Key prefix:', apiKey.substring(0, 8) + '...');
    console.log('API Key length:', apiKey.length);

    // Test the API key by making a simple request to list assistants
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.text();
    console.log('VAPI Response Status:', response.status);
    console.log('VAPI Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('VAPI Response Body:', responseData);

    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid VAPI API Key - 401 Unauthorized',
        details: {
          message: 'Your VAPI API key is invalid or expired',
          apiKeyPrefix: apiKey.substring(0, 8) + '...',
          responseBody: responseData,
          suggestion: 'Check your VAPI dashboard for the correct API key'
        }
      });
    }

    if (response.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'VAPI API Key Forbidden - 403',
        details: {
          message: 'Your API key does not have permission for this operation',
          apiKeyPrefix: apiKey.substring(0, 8) + '...',
          responseBody: responseData,
          suggestion: 'Check your VAPI account permissions'
        }
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `VAPI API Error: ${response.status} ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseData,
          apiKeyPrefix: apiKey.substring(0, 8) + '...'
        }
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch (parseError) {
      parsedData = { raw: responseData };
    }

    return NextResponse.json({
      success: true,
      message: 'VAPI API key is valid!',
      details: {
        status: response.status,
        apiKeyPrefix: apiKey.substring(0, 8) + '...',
        assistantCount: Array.isArray(parsedData) ? parsedData.length : 'Unknown',
        responsePreview: Array.isArray(parsedData) ? parsedData.slice(0, 2) : parsedData
      }
    });

  } catch (error) {
    console.error('VAPI test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        type: typeof error,
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
}