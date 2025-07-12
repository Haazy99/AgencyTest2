import { getAccessToken } from '@/lib/auth-utils';
import { GHL_API_BASE } from './constants';
import { GHLContact, GHLContactResponse, GHLContactSearchParams } from './types';
import { getAuthHeaders, handleApiResponse, buildQueryParams, retryWithBackoff } from './utils';
import { getLocationToken } from './locations';

/**
 * Search for contacts in a specific location
 */
export async function searchGHLContacts(locationId: string, searchParams: GHLContactSearchParams): Promise<any> {
  return retryWithBackoff(async () => {
    console.log('Searching GHL contacts in location:', locationId, 'with params:', searchParams);
    
    const agencyToken = await getAccessToken();
    if (!agencyToken) {
      throw new Error('No agency access token available');
    }
    
    // Build query parameters
    const queryParams = buildQueryParams({
      ...searchParams,
      locationId,
      limit: searchParams.limit || 50
    });
    
    const headers = {
      'Authorization': `Bearer ${agencyToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '2021-07-28',
    };
    
    // Try different search endpoints
    const endpoints = [
      `${GHL_API_BASE}/contacts/search?${queryParams.toString()}`,
      `${GHL_API_BASE}/contacts?${queryParams.toString()}`,
    ];
    
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying contact search endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully searched GHL contacts using endpoint: ${endpoint}`, data);
          return data;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log(`Search endpoint ${endpoint} failed:`, response.status, errorData);
          lastError = new Error(`${endpoint}: ${response.status} ${errorData.message || response.statusText}`);
        }
      } catch (endpointError: any) {
        console.log(`Search endpoint ${endpoint} threw error:`, endpointError.message);
        lastError = endpointError;
      }
    }
    
    // If we get here, all endpoints failed
    throw lastError || new Error('All contact search endpoints failed');
  });
}

/**
 * Get a specific contact by ID
 */
export async function getGHLContact(contactId: string, locationId: string): Promise<any> {
  return retryWithBackoff(async () => {
    console.log('Getting GHL contact:', contactId, 'in location:', locationId);
    
    const agencyToken = await getAccessToken();
    if (!agencyToken) {
      throw new Error('No agency access token available');
    }
    
    const headers = {
      'Authorization': `Bearer ${agencyToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '2021-07-28',
    };
    
    // Try different get contact endpoints
    const endpoints = [
      `${GHL_API_BASE}/contacts/${contactId}`,
    ];
    
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying get contact endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully retrieved GHL contact using endpoint: ${endpoint}`, data);
          return data;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log(`Get contact endpoint ${endpoint} failed:`, response.status, errorData);
          lastError = new Error(`${endpoint}: ${response.status} ${errorData.message || response.statusText}`);
        }
      } catch (endpointError: any) {
        console.log(`Get contact endpoint ${endpoint} threw error:`, endpointError.message);
        lastError = endpointError;
      }
    }
    
    // If we get here, all endpoints failed
    throw lastError || new Error('All get contact endpoints failed');
  });
}

/**
 * Create a contact in the specified GHL location
 */
export async function createGHLContact(locationId: string, contactData: GHLContact): Promise<GHLContactResponse> {
  return retryWithBackoff(async () => {
    console.log('Creating GHL contact in location:', locationId, 'with data:', contactData);
    
    // Prepare the contact data with locationId included
    const contactPayload = {
      ...contactData,
      locationId: locationId, // This is required in the request body
    };
    
    const primaryEndpoint = `${GHL_API_BASE}/contacts/`;
    
    // Strategy 1: Try with location token first (preferred method)
    try {
      console.log('Attempting contact creation with location token...');
      const locationToken = await getLocationToken(locationId);
      
      const locationHeaders = {
        'Authorization': `Bearer ${locationToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28',
      };
      
      console.log(`Trying location token with endpoint: ${primaryEndpoint}`);
      console.log('Location headers:', locationHeaders);
      console.log('Payload:', JSON.stringify(contactPayload, null, 2));
      
      const locationResponse = await fetch(primaryEndpoint, {
        method: 'POST',
        headers: locationHeaders,
        body: JSON.stringify(contactPayload),
      });

      console.log('Location token response status:', locationResponse.status);

      if (locationResponse.ok) {
        const data = await locationResponse.json();
        console.log(`Successfully created GHL contact using location token:`, data);
        return data;
      } else {
        const errorData = await locationResponse.json().catch(() => ({}));
        console.log('Location token method failed:', locationResponse.status, errorData);
        
        // If location token fails due to scope/auth issues, try agency token as fallback
        if (locationResponse.status === 401) {
          console.log('Location token authentication failed, trying agency token fallback...');
        } else {
          // For other errors (like validation), don't retry with agency token
          throw new Error(`Contact creation failed with location token (${locationResponse.status}): ${errorData.message || locationResponse.statusText}`);
        }
      }
    } catch (locationTokenError: any) {
      console.log('Location token method failed:', locationTokenError.message);
      console.log('Falling back to agency token method...');
    }

    // Strategy 2: Fallback to agency token (may have limited permissions)
    try {
      console.log('Attempting contact creation with agency token...');
      
      const agencyToken = await getAccessToken();
      if (!agencyToken) {
        throw new Error('No agency access token available');
      }
      
      const agencyHeaders = {
        'Authorization': `Bearer ${agencyToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28',
      };
      
      console.log(`Trying agency token with endpoint: ${primaryEndpoint}`);
      
      const agencyResponse = await fetch(primaryEndpoint, {
        method: 'POST',
        headers: agencyHeaders,
        body: JSON.stringify(contactPayload),
      });

      console.log('Agency token response status:', agencyResponse.status);

      if (agencyResponse.ok) {
        const data = await agencyResponse.json();
        console.log(`Successfully created GHL contact using agency token:`, data);
        return data;
      } else {
        const errorData = await agencyResponse.json().catch(() => ({}));
        console.log('Agency token method also failed:', agencyResponse.status, errorData);
        
        // Enhanced error message for authClass issues
        if (errorData.message?.includes('authClass') || errorData.message?.includes('scope')) {
          throw new Error(`Failed to create contact with agency token: Authentication failed: ${errorData.message}. This typically means your GoHighLevel app needs additional OAuth scopes (oauth.write) or location-specific permissions.`);
        }
        
        throw new Error(`Failed to create contact with agency token (${agencyResponse.status}): ${errorData.message || agencyResponse.statusText}`);
      }
    } catch (agencyTokenError: any) {
      console.log('Agency token method failed:', agencyTokenError.message);
      throw agencyTokenError;
    }
  });
} 