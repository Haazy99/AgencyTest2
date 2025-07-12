import { NextResponse } from 'next/server';
import { getSession, clearTokensFromSession } from '@/lib/auth-utils';

export async function POST() {
  try {
    const session = await getSession();
    
    if (!session.ghlConnected) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already disconnected from GoHighLevel' 
      });
    }

    // Clear all GHL-related data from session
    await clearTokensFromSession();

    console.log('Successfully disconnected from GoHighLevel');

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully disconnected from GoHighLevel' 
    });

  } catch (error: any) {
    console.error('Error disconnecting from GoHighLevel:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect from GoHighLevel', message: error.message },
      { status: 500 }
    );
  }
} 