import { NextRequest, NextResponse } from 'next/server';
import { storeTokens, getSession } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Test storing some dummy tokens
    const testTokens = {
      access_token: 'test_access_token_12345',
      refresh_token: 'test_refresh_token_67890',
      token_type: 'Bearer',
      expires_in: 3600
    };

    console.log('Testing token storage...');
    
    // Store the test tokens
    await storeTokens('test-company-id', 'test-user-id', testTokens);
    
    // Immediately check the session
    const session = await getSession();
    
    return NextResponse.json({
      success: true,
      message: 'Test tokens stored successfully',
      sessionAfterStore: {
        ghlConnected: session.ghlConnected,
        ghlCompanyId: session.ghlCompanyId,
        ghlUserId: session.ghlUserId,
        hasTokenData: !!session.ghlTokenData,
        tokenDataLength: session.ghlTokenData ? session.ghlTokenData.length : 0,
        tokenExpiry: session.ghlTokenExpiryTimestamp,
        sessionId: session.sessionId,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in test store tokens endpoint:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to test token storage',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 