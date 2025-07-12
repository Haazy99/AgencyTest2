import { NextRequest, NextResponse } from 'next/server';
import { getLocationToken, fetchGHLLocations } from '@/lib/ghl/api';
import { getAccessToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { locationId } = await request.json();
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Check if we have access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available. Please reconnect to GoHighLevel.' },
        { status: 401 }
      );
    }

    console.log('Testing location token generation for location:', locationId);

    // Try to generate location token
    const locationToken = await getLocationToken(locationId);
    
    return NextResponse.json({
      success: true,
      message: 'Location token generated successfully',
      locationId: locationId,
      hasLocationToken: !!locationToken,
      locationTokenLength: locationToken.length,
      locationTokenPreview: locationToken.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating location token:', error);
    
    // Check for specific OAuth scope errors
    if (error.message.includes('oauth.write')) {
      return NextResponse.json(
        { 
          error: 'OAuth scope missing',
          details: 'Your GoHighLevel app is missing the oauth.write scope. Please update your app permissions.',
          solution: 'Go to your GoHighLevel app settings and add oauth.write to your OAuth scopes, then reconnect.',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate location token',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check connection status and available locations for testing
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available. Please reconnect to GoHighLevel.' },
        { status: 401 }
      );
    }

    const locations = await fetchGHLLocations();

    return NextResponse.json({
      success: true,
      message: 'Location token test endpoint ready',
      hasAccessToken: !!accessToken,
      tokenLength: accessToken.length,
      locationsCount: locations.length,
      availableLocations: locations.map(loc => ({
        id: loc.id,
        name: loc.name
      })),
      instructions: 'POST to this endpoint with { "locationId": "your-location-id" } to test location token generation'
    });

  } catch (error: any) {
    console.error('Error in location token test endpoint:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get test information',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 