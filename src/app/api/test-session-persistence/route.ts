import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing session persistence...');
    
    // Get session and store some test data
    const session1 = await getSession();
    session1.ghlConnected = true;
    session1.ghlCompanyId = 'test-company-123';
    session1.ghlUserId = 'test-user-456';
    await session1.save();
    
    console.log('Stored test data in session');
    
    // Immediately get a new session instance and check if data persists
    const session2 = await getSession();
    
    const result = {
      success: true,
      message: 'Session persistence test completed',
      session1Data: {
        ghlConnected: session1.ghlConnected,
        ghlCompanyId: session1.ghlCompanyId,
        ghlUserId: session1.ghlUserId,
      },
      session2Data: {
        ghlConnected: session2.ghlConnected,
        ghlCompanyId: session2.ghlCompanyId,
        ghlUserId: session2.ghlUserId,
      },
      dataMatches: (
        session1.ghlConnected === session2.ghlConnected &&
        session1.ghlCompanyId === session2.ghlCompanyId &&
        session1.ghlUserId === session2.ghlUserId
      ),
      timestamp: new Date().toISOString()
    };
    
    console.log('Session persistence test result:', result);
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in session persistence test:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to test session persistence',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 