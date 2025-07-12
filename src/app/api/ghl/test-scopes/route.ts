import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth-utils';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export async function GET(request: NextRequest) {
  try {
    // Check if we have access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available. Please connect to GoHighLevel first.' },
        { status: 401 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '2021-07-28',
    };

    console.log('Testing various GoHighLevel API endpoints to check scope permissions...');

    const testResults = [];

    // Test 1: Get locations (should work with locations.readonly)
    try {
      console.log('Testing locations endpoint...');
      const locationsResponse = await fetch(`${GHL_API_BASE}/locations?limit=5`, {
        method: 'GET',
        headers,
      });
      
      testResults.push({
        test: 'GET /locations',
        scope: 'locations.readonly',
        status: locationsResponse.status,
        success: locationsResponse.ok,
        error: locationsResponse.ok ? null : await locationsResponse.text().catch(() => 'Unknown error')
      });
    } catch (error: any) {
      testResults.push({
        test: 'GET /locations',
        scope: 'locations.readonly',
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }

    // Test 2: Search contacts (should work with contacts.readonly)
    try {
      console.log('Testing contacts search endpoint...');
      const contactsResponse = await fetch(`${GHL_API_BASE}/contacts/search?limit=1`, {
        method: 'GET',
        headers,
      });
      
      testResults.push({
        test: 'GET /contacts/search',
        scope: 'contacts.readonly',
        status: contactsResponse.status,
        success: contactsResponse.ok,
        error: contactsResponse.ok ? null : await contactsResponse.text().catch(() => 'Unknown error')
      });
    } catch (error: any) {
      testResults.push({
        test: 'GET /contacts/search',
        scope: 'contacts.readonly',
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }

    // Test 3: Test location token endpoint (requires oauth.write)
    try {
      console.log('Testing location token endpoint...');
      const tokenResponse = await fetch(`${GHL_API_BASE}/oauth/locationToken`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companyId: 'test-company-id',
          locationId: 'test-location-id',
        }),
      });
      
      testResults.push({
        test: 'POST /oauth/locationToken',
        scope: 'oauth.write',
        status: tokenResponse.status,
        success: tokenResponse.ok,
        error: tokenResponse.ok ? null : await tokenResponse.text().catch(() => 'Unknown error')
      });
    } catch (error: any) {
      testResults.push({
        test: 'POST /oauth/locationToken',
        scope: 'oauth.write',
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }

    // Test 4: Test contact creation (requires contacts.write)
    try {
      console.log('Testing contact creation endpoint...');
      const createResponse = await fetch(`${GHL_API_BASE}/contacts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Scope',
          email: 'test-scope@example.com',
          locationId: 'test-location-id'
        }),
      });
      
      testResults.push({
        test: 'POST /contacts',
        scope: 'contacts.write',
        status: createResponse.status,
        success: createResponse.ok,
        error: createResponse.ok ? null : await createResponse.text().catch(() => 'Unknown error')
      });
    } catch (error: any) {
      testResults.push({
        test: 'POST /contacts',
        scope: 'contacts.write',
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }

    // Analyze results
    const workingScopes = testResults.filter(r => r.success).map(r => r.scope);
    const failingScopes = testResults.filter(r => !r.success);
    
    const scopeAnalysis = {
      hasLocationsRead: workingScopes.includes('locations.readonly'),
      hasContactsRead: workingScopes.includes('contacts.readonly'),
      hasContactsWrite: workingScopes.includes('contacts.write'),
      hasOAuthWrite: workingScopes.includes('oauth.write'),
      canCreateContacts: workingScopes.includes('contacts.write'),
      canGetLocationTokens: workingScopes.includes('oauth.write'),
    };

    return NextResponse.json({
      success: true,
      tokenLength: accessToken.length,
      testResults,
      scopeAnalysis,
      workingScopes,
      failingTests: failingScopes,
      recommendation: scopeAnalysis.canCreateContacts 
        ? 'Your token has contacts.write scope. Contact creation should work.'
        : 'Your token is missing contacts.write scope. You need to update your GoHighLevel app configuration.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in scope test endpoint:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to test scopes',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 