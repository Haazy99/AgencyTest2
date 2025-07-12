import { NextResponse } from 'next/server';
import { getSession, getAccessToken } from '@/lib/auth-utils';

export async function GET() {
  try {
    const session = await getSession();
    
    // Check if session shows connected AND we actually have access tokens
    const sessionConnected = !!session.ghlConnected;
    let hasValidTokens = false;
    
    if (sessionConnected && session.ghlCompanyId && session.ghlUserId && (session.ghlTokenData || session.sessionId)) {
      // Check if we have tokens in session and they're not expired
      if (session.ghlTokenExpiryTimestamp) {
        const now = Math.floor(Date.now() / 1000);
        hasValidTokens = now < session.ghlTokenExpiryTimestamp;
      }
      
      // Double-check by trying to get access token
      if (!hasValidTokens) {
        try {
          const accessToken = await getAccessToken();
          hasValidTokens = !!accessToken;
        } catch (error) {
          console.log('No valid access tokens found for session');
          hasValidTokens = false;
        }
      }
    }
    
    const isConnected = sessionConnected && hasValidTokens;
    
    return NextResponse.json({ 
      isConnected,
      companyId: session.ghlCompanyId,
      debug: {
        sessionConnected,
        hasValidTokens,
        hasCompanyId: !!session.ghlCompanyId,
        hasUserId: !!session.ghlUserId,
        hasTokenData: !!session.ghlTokenData,
        hasSessionId: !!session.sessionId,
        tokenDataSize: session.ghlTokenData ? session.ghlTokenData.length : 0,
        storageMethod: session.ghlTokenData ? 'compressed_session' : (session.sessionId ? 'memory_reference' : 'none'),
        tokenExpiry: session.ghlTokenExpiryTimestamp,
        tokenExpired: session.ghlTokenExpiryTimestamp ? 
          Math.floor(Date.now() / 1000) >= session.ghlTokenExpiryTimestamp : null
      }
    });
  } catch (error) {
    console.error('Error checking GHL connection status:', error);
    return NextResponse.json({ isConnected: false }, { status: 500 });
  }
}