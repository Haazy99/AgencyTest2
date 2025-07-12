import { NextResponse } from 'next/server';
import { getSession, getAccessToken } from '@/lib/auth-utils';

export async function GET() {
  try {
    const session = await getSession();
    const accessToken = await getAccessToken();
    
    return NextResponse.json({
      success: true,
      session: {
        ghlConnected: session.ghlConnected,
        hasCompanyId: !!session.ghlCompanyId,
        companyId: session.ghlCompanyId ? `${session.ghlCompanyId.substring(0, 8)}...` : null,
        hasUserId: !!session.ghlUserId,
        userId: session.ghlUserId ? `${session.ghlUserId.substring(0, 8)}...` : null,
        hasTokenData: !!session.ghlTokenData,
        tokenDataSize: session.ghlTokenData ? session.ghlTokenData.length : 0,
        tokenExpiry: session.ghlTokenExpiryTimestamp,
        tokenExpired: session.ghlTokenExpiryTimestamp ? 
          Math.floor(Date.now() / 1000) >= session.ghlTokenExpiryTimestamp : null
      },
      token: {
        hasAccessToken: !!accessToken,
        tokenLength: accessToken ? accessToken.length : 0,
        tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting session debug info:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get session debug info',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 