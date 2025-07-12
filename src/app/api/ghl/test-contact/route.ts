import { NextRequest, NextResponse } from 'next/server';
import { createGHLContact, searchGHLContacts, getGHLContact, fetchGHLLocations } from '@/lib/ghl/api';
import { getAccessToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { locationId, action = 'create' } = await request.json();
    
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

    if (action === 'search') {
      // Search for existing contacts
      console.log('Searching for contacts in location:', locationId);
      const searchResult = await searchGHLContacts(locationId, { 
        limit: 10,
        query: 'test'
      });
      
      return NextResponse.json({
        success: true,
        action: 'search',
        locationId: locationId,
        searchResult: searchResult,
        contactCount: searchResult?.contacts?.length || 0
      });
    }

    // Test contact data
    const testContact = {
      firstName: 'Test',
      lastName: 'Contact',
      email: `test-${Date.now()}@example.com`,
      phone: '+1234567890',
      companyName: 'Test Company',
      tags: ['test-lead', 'api-test']
    };

    console.log('Creating test contact in location:', locationId);
    console.log('Test contact data:', testContact);

    // Create the test contact
    const result = await createGHLContact(locationId, testContact);
    console.log('Contact creation result:', result);

    // Verify the contact was created
    let verificationResult = null;
    if (result.contact && result.contact.id) {
      try {
        console.log('Verifying contact creation by retrieving contact:', result.contact.id);
        verificationResult = await getGHLContact(result.contact.id, locationId);
        console.log('Contact verification successful:', verificationResult);
      } catch (verificationError) {
        console.log('Contact verification failed:', verificationError);
      }
    }

    // Search for the contact we just created
    let searchResult = null;
    try {
      console.log('Searching for the created contact by email:', testContact.email);
      searchResult = await searchGHLContacts(locationId, { 
        email: testContact.email,
        limit: 1 
      });
      console.log('Search result:', searchResult);
    } catch (searchError) {
      console.log('Search failed:', searchError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test contact created successfully',
      contactId: result.contact.id,
      contact: result.contact,
      locationId: locationId,
      verification: {
        retrievalSuccessful: !!verificationResult,
        searchSuccessful: !!searchResult,
        foundInSearch: searchResult?.contacts?.length > 0,
        retrievedContact: verificationResult,
        searchResults: searchResult
      }
    });

  } catch (error: any) {
    console.error('Error creating test contact:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create test contact',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check connection status and available locations
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
      hasAccessToken: !!accessToken,
      tokenLength: accessToken.length,
      locationsCount: locations.length,
      locations: locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        companyId: loc.companyId
      }))
    });

  } catch (error: any) {
    console.error('Error in test endpoint:', error);
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