import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    return NextResponse.json({
      success: true,
      sessionData: {
        ghlConnected: session.ghlConnected,
        ghlCompanyId: session.ghlCompanyId ? `${session.ghlCompanyId.substring(0, 8)}...` : null,
        ghlUserId: session.ghlUserId ? `${session.ghlUserId.substring(0, 8)}...` : null,
        hasTokenData: !!session.ghlTokenData,
        tokenDataLength: session.ghlTokenData ? session.ghlTokenData.length : 0,
        tokenExpiry: session.ghlTokenExpiryTimestamp,
        sessionId: session.sessionId ? `${session.sessionId.substring(0, 8)}...` : null,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in test session endpoint:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get session data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 