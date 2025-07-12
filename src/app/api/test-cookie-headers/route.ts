import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing cookie headers...');
    
    // Get session and store some test data
    const session = await getSession();
    session.ghlConnected = true;
    session.ghlCompanyId = 'cookie-test-company';
    session.ghlUserId = 'cookie-test-user';
    await session.save();
    
    console.log('Stored test data in session for cookie test');
    
    // Create response with session data
    const response = NextResponse.json({
      success: true,
      message: 'Cookie test completed - check response headers for Set-Cookie',
      sessionData: {
        ghlConnected: session.ghlConnected,
        ghlCompanyId: session.ghlCompanyId,
        ghlUserId: session.ghlUserId,
      },
      timestamp: new Date().toISOString()
    });
    
    // Log what we're returning
    console.log('Cookie test response created');
    
    return response;

  } catch (error: any) {
    console.error('Error in cookie test:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to test cookies',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 