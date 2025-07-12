import { NextRequest, NextResponse } from 'next/server';
import { createGHLContact, type GHLContact } from '@/lib/ghl/api';
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

    // Test contact data that matches the failing export
    const testContact: GHLContact = {
      firstName: 'Test',
      lastName: 'Export',
      email: 'test-export@pimlicoplumbers.com',
      phone: '+442081080808',
      companyName: 'Pimlico Plumbers Test',
      address1: 'Pimlico House',
      city: 'London',
      state: 'London',
      postalCode: 'SE11 6NQ',
      country: 'GB',
      website: 'https://www.pimlicoplumbers.com/',
      tags: ['test-export', 'Plumbers']
    };

    console.log('Testing export with location:', locationId);
    console.log('Test contact data:', testContact);

    // Create the test contact using the same function as export-lead
    const result = await createGHLContact(locationId, testContact);
    console.log('Contact creation result:', result);

    return NextResponse.json({
      success: true,
      message: 'Test export completed successfully',
      contactId: result.contact.id,
      contact: result.contact,
      locationId: locationId,
      testData: testContact
    });

  } catch (error: any) {
    console.error('Error in test export:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to test export',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check connection status
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available. Please reconnect to GoHighLevel.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test export endpoint is ready',
      hasAccessToken: !!accessToken,
      tokenLength: accessToken.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in test export GET:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to check test export status',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 