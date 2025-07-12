import { NextResponse } from 'next/server';
import { getSession, getAccessToken } from '@/lib/auth-utils';

export async function GET() {
  try {
    const session = await getSession();
    
    const debugInfo: any = {
      session: {
        ghlConnected: session.ghlConnected,
        hasCompanyId: !!session.ghlCompanyId,
        hasUserId: !!session.ghlUserId,
        hasTokenData: !!session.ghlTokenData,
        hasSessionId: !!session.sessionId,
        companyId: session.ghlCompanyId ? `${session.ghlCompanyId.substring(0, 8)}...` : null,
        userId: session.ghlUserId ? `${session.ghlUserId.substring(0, 8)}...` : null,
        sessionId: session.sessionId ? `${session.sessionId.substring(0, 8)}...` : null,
        tokenDataSize: session.ghlTokenData ? session.ghlTokenData.length : 0,
        storageMethod: session.ghlTokenData ? 'compressed_session' : (session.sessionId ? 'memory_reference' : 'none'),
        tokenExpiry: session.ghlTokenExpiryTimestamp,
        tokenExpiryDate: session.ghlTokenExpiryTimestamp 
          ? new Date(session.ghlTokenExpiryTimestamp * 1000).toISOString() 
          : null,
      },
      tokens: {
        hasAccessToken: false,
        isExpired: false,
        expiryTimestamp: null as number | null,
        expiryDate: null as string | null,
        tokenType: null as string | null,
      },
      environment: {
        hasClientId: !!process.env.GHL_CLIENT_ID,
        hasClientSecret: !!process.env.GHL_CLIENT_SECRET,
        hasRedirectUri: !!process.env.GHL_REDIRECT_URI,
        redirectUri: process.env.GHL_REDIRECT_URI,
      },
      timestamp: new Date().toISOString(),
    };

    // Check token validity
    if (session.ghlConnected && (session.ghlTokenData || session.sessionId) && session.ghlTokenExpiryTimestamp) {
      const now = Math.floor(Date.now() / 1000);
      debugInfo.tokens = {
        hasAccessToken: true,
        isExpired: now >= session.ghlTokenExpiryTimestamp,
        expiryTimestamp: session.ghlTokenExpiryTimestamp,
        expiryDate: new Date(session.ghlTokenExpiryTimestamp * 1000).toISOString(),
        tokenType: 'Bearer',
      };
    }

    // Test access token retrieval
    try {
      const accessToken = await getAccessToken();
      debugInfo.accessTokenTest = {
        success: !!accessToken,
        hasToken: !!accessToken,
        tokenLength: accessToken ? accessToken.length : 0,
      };
    } catch (error: any) {
      debugInfo.accessTokenTest = {
        success: false,
        error: error.message,
      };
    }

    return NextResponse.json(debugInfo);
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug information', message: error.message },
      { status: 500 }
    );
  }
} 