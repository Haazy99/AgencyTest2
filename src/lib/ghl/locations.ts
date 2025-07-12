import { getSession, getAccessToken } from '@/lib/auth-utils';
import { GHL_API_BASE, DEFAULT_LOCATION_LIMIT } from './constants';
import { GHLLocation } from './types';
import { getAuthHeaders, handleApiResponse, retryWithBackoff } from './utils';

/**
 * Fetch all locations (sub-accounts) for the connected agency
 */
export async function fetchGHLLocations(): Promise<GHLLocation[]> {
  return retryWithBackoff(async () => {
    const headers = await getAuthHeaders();
    const session = await getSession();
    
    if (!session.ghlCompanyId) {
      throw new Error('No company ID found in session. Please reconnect to GoHighLevel.');
    }
    
    // Try different possible GHL API 2.0 endpoints for locations
    const possibleEndpoints = [
      `${GHL_API_BASE}/locations`,
      `${GHL_API_BASE}/locations/search`,
    ];

    let lastError: any = null;

    for (const endpoint of possibleEndpoints) {
      // Try multiple variations of each endpoint
      const urlVariations = [];
      
      if (endpoint.includes('/locations/search')) {
        urlVariations.push(`${endpoint}?limit=${DEFAULT_LOCATION_LIMIT}`);
        urlVariations.push(`${endpoint}?companyId=${session.ghlCompanyId}&limit=${DEFAULT_LOCATION_LIMIT}`);
      } else if (endpoint.includes('/locations')) {
        urlVariations.push(`${endpoint}?limit=${DEFAULT_LOCATION_LIMIT}`);
        urlVariations.push(`${endpoint}?companyId=${session.ghlCompanyId}&limit=${DEFAULT_LOCATION_LIMIT}`);
        urlVariations.push(endpoint); // Try without any parameters
      }
      
      for (const url of urlVariations) {
        try {
          console.log(`Trying GHL locations endpoint: ${endpoint}`);
          console.log(`Final URL: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Successfully fetched GHL locations from:', url, data);

            // The response structure might be { locations: [...] } or just [...]
            const locations = data.locations || data;
            
            if (Array.isArray(locations)) {
              return locations;
            } else if (Array.isArray(data)) {
              return data;
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.log(`URL ${url} failed with status ${response.status}:`, errorData);
            lastError = new Error(`${url}: ${response.status} ${errorData.message || response.statusText}`);
          }
        } catch (error: any) {
          console.log(`URL ${url} threw error:`, error.message);
          lastError = error;
        }
      }
    }

    // If we get here, all endpoints failed
    console.error('All GHL locations endpoints failed. Last error:', lastError);
    throw new Error(`Failed to fetch GHL locations from any endpoint. Last error: ${lastError?.message || 'Unknown error'}`);
  });
}

/**
 * Generate a location-specific token using agency token
 */
export async function getLocationToken(locationId: string): Promise<string> {
  return retryWithBackoff(async () => {
    console.log('Generating location token for location:', locationId);
    
    const agencyToken = await getAccessToken();
    if (!agencyToken) {
      throw new Error('No agency access token available');
    }
    
    const session = await getSession();
    if (!session.ghlCompanyId) {
      throw new Error('No company ID found in session. Please reconnect to GoHighLevel.');
    }
    
    const headers = {
      'Authorization': `Bearer ${agencyToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '2021-07-28',
    };
    
    // GoHighLevel location token generation endpoint
    const tokenEndpoint = `${GHL_API_BASE}/oauth/locationToken`;
    
    // Try different request formats
    const requestFormats = [
      // Format 1: Use companyId from session
      {
        companyId: session.ghlCompanyId,
        locationId: locationId,
      },
      // Format 2: Use only locationId
      {
        locationId: locationId,
      },
      // Format 3: Use location as companyId (some APIs expect this)
      {
        companyId: locationId,
      }
    ];
    
    let lastError: any = null;
    
    for (let i = 0; i < requestFormats.length; i++) {
      const payload = requestFormats[i];
      console.log(`Trying location token format ${i + 1}:`, payload);
      
      try {
        console.log(`Requesting location token from: ${tokenEndpoint}`);
        
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        console.log(`Format ${i + 1} response status:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully generated location token with format ${i + 1}`);
          
          // The response typically contains the access_token field
          if (data.access_token) {
            return data.access_token;
          } else if (data.token) {
            return data.token;
          } else {
            console.log(`Format ${i + 1} response data:`, data);
            throw new Error('Location token not found in response');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log(`Format ${i + 1} failed:`, response.status, errorData);
          lastError = new Error(`Failed to generate location token with format ${i + 1} (${response.status}): ${errorData.message || response.statusText}`);
          
          // Don't continue trying other formats for auth errors - they'll all fail
          if (response.status === 401 || response.status === 403) {
            if (errorData.message?.includes('oauth') || errorData.message?.includes('scope')) {
              throw new Error('Missing oauth.write scope. Please update your GoHighLevel app permissions to include oauth.write scope.');
            }
            break;
          }
        }
      } catch (fetchError: any) {
        console.log(`Format ${i + 1} request failed:`, fetchError.message);
        lastError = fetchError;
        
        // If it's our specific scope error, don't continue
        if (fetchError.message.includes('oauth.write')) {
          throw fetchError;
        }
      }
    }
    
    // If all formats failed, throw the last error
    throw lastError || new Error('All location token request formats failed');
  });
} 