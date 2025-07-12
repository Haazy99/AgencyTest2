'use server';
/**
 * @fileOverview Service for interacting with the D7 Lead Finder API.
 */

import type { D7Lead } from '@/types';

const D7_SEARCH_API_URL = 'https://dash.d7leadfinder.com/app/api/search/';
const D7_RESULTS_API_URL = 'https://dash.d7leadfinder.com/app/api/results/';

interface D7ApiLead {
  name?: string;
  contact_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  website?: string;
  full_address?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  zip_postal_code?: string;
  country?: string;
  category?: string;
  social_media?: Record<string, any>;
  [key: string]: any;
}

interface D7SearchResponse {
  searchid?: string | number; 
  status?: string; 
  message?: string; 
  results?: D7ApiLead[];
  data?: D7ApiLead[]; 
  wait_seconds?: string;
  [key: string]: any; 
}

interface D7ResultsResponse {
    status?: string; 
    data?: D7ApiLead[]; 
    results?: D7ApiLead[];
    message?: string;
    [key: string]: any;
}


function transformD7ApiLeadToD7Lead(apiLead: D7ApiLead, queryKeyword: string, queryCity: string, queryCountryCode: string): Omit<D7Lead, 'id'> {
  let firstName = apiLead.first_name;
  let lastName = apiLead.last_name;

  if (!firstName && !lastName && apiLead.contact_name) {
    const nameParts = apiLead.contact_name.split(' ');
    firstName = nameParts[0];
    if (nameParts.length > 1) {
      lastName = nameParts.slice(1).join(' ');
    }
  }
  
  // Use queryCountryCode as fallback if apiLead.country is not provided.
  // D7 docs often use full country names in response, but CC is used in query.
  const countryName = apiLead.country || queryCountryCode.toUpperCase(); 

  // Extract Facebook page from social media data if available
  let facebookPage = null;
  if (apiLead.social_media && typeof apiLead.social_media === 'object') {
    const socialMedia = apiLead.social_media as Record<string, any>;
    if (socialMedia.facebook) {
      facebookPage = socialMedia.facebook;
      // Ensure URL format
      if (!facebookPage.startsWith('http')) {
        facebookPage = `https://facebook.com/${facebookPage.replace('facebook.com/', '')}`;
      }
    }
  }

  // If no Facebook page in social_media, try to construct from company name
  if (!facebookPage && apiLead.name) {
    const companyHandle = apiLead.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
    facebookPage = `https://facebook.com/${companyHandle}`;
  }

  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: apiLead.email || undefined,
    phone: apiLead.phone_number || undefined,
    companyName: apiLead.name || undefined,
    website: apiLead.website || undefined,
    address: apiLead.full_address || apiLead.street_address || undefined,
    city: apiLead.city || queryCity,
    state: apiLead.state_province || undefined,
    zipCode: apiLead.zip_postal_code || undefined,
    country: countryName,
    category: apiLead.category || queryKeyword,
    facebookPage,
    hasActiveAds: null,
    adLibraryUrl: null,
    lastAdScanDate: null,
    queryKeyword,
    queryLocation: `${queryCity}, ${queryCountryCode.toUpperCase()}`,
    // Include any other fields from the API lead directly
    ...Object.fromEntries(
      Object.entries(apiLead).filter(([key]) => ![
        'name', 'contact_name', 'first_name', 'last_name', 'email', 'phone_number',
        'website', 'full_address', 'street_address', 'city', 'state_province',
        'zip_postal_code', 'country', 'category', 'social_media'
      ].includes(key))
    ),
  };
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        // Clone response to read text for JSON validation, original response body can only be read once
        const clonedResponse = response.clone();
        const responseText = await clonedResponse.text();
        try {
          const data = JSON.parse(responseText);
          // Check if D7 API returned HTTP 200 but has an error status in its JSON body
          if (data && (data.status === 'error' || (data.message && data.message.toLowerCase().includes('error') && !data.searchid))) { // Be more specific with error check
            const errorMessage = `D7 API call to ${url} reported an error in its JSON body: ${data.message || JSON.stringify(data)}`;
            console.error(errorMessage, data); // Log the error and data
            throw new Error(errorMessage); // Throw to be caught by the outer try/catch
          }
        } catch (e: any) {
          if (e instanceof SyntaxError) { // Non-JSON response but HTTP OK
             console.warn(`D7 API call to ${url} returned HTTP ${response.status} but response was not valid JSON. Response text: >>>${responseText}<<<`);
             // It's possible D7 returns non-JSON for certain errors even with HTTP 200
             throw new Error(`D7 API returned non-JSON response for ${url}: ${responseText.substring(0, 200)}`);
          }
          // If it's our specific "D7 API call to..." error, re-throw it
          if (e.message.startsWith('D7 API call to')) throw e;
          // Otherwise, log the parsing error but don't necessarily stop if the original response was fine.
          console.warn(`Error processing D7 API response from ${url}. Response text: >>>${responseText}<<< Parsing Error: ${e.message}`);
        }
      }
      
      // Retry for specific HTTP status codes
      if (response.status === 429 && i < retries - 1) { // Rate limit
        console.warn(`D7 API rate limit hit for ${url}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      if (response.status >= 500 && i < retries - 1) { // Server-side errors
        console.warn(`D7 API server error (${response.status}) for ${url}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      return response;
    } catch (error: any) {
      // If it's one of our specific D7 errors or non-JSON error, re-throw
      if (error.message.startsWith('D7 API call to') || error.message.startsWith('D7 API returned non-JSON response')) throw error;
      
      if (i === retries - 1) throw error; // Last retry failed
      console.warn(`Fetch to ${url} failed (attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s... Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error(`Failed to fetch from ${url} after ${retries} retries.`);
}


export async function fetchLeadsFromD7(keyword: string, cityname: string, countryCode: string, limit: number = 10): Promise<Omit<D7Lead, 'id'>[]> {
  const apiKey = process.env.D7_LEAD_FINDER_API_KEY;

  if (!apiKey) {
    console.error('D7 Lead Finder API key is missing.');
    throw new Error('D7 Lead Finder API key is not configured.');
  }

  const searchParams = new URLSearchParams({
    keyword: keyword,
    country: countryCode.toUpperCase(),
    location: cityname,
    key: apiKey,
  });
  const searchUrl = `${D7_SEARCH_API_URL}?${searchParams.toString()}`;

  console.log(`Fetching D7 Search ID from: ${searchUrl}`);
  let searchIdValue: string | number | undefined;

  try {
    const searchResponse = await fetchWithRetry(searchUrl, { method: 'GET' });
    const searchResponseText = await searchResponse.text(); // Get text first for robust parsing

    if (!searchResponse.ok) {
      // Attempt to parse error from D7 if available
      let d7ErrorMsg = searchResponseText;
      try {
        const errorJson = JSON.parse(searchResponseText);
        d7ErrorMsg = errorJson.message || d7ErrorMsg;
      } catch (e) { /* ignore parsing error, use raw text */ }
      console.error(`D7 Search API HTTP Error (${searchResponse.status}) for URL ${searchUrl}. Response: ${d7ErrorMsg}`);
      throw new Error(`Failed to initiate search with D7 Lead Finder (HTTP ${searchResponse.status}): ${d7ErrorMsg}`);
    }
    
    let searchData: D7SearchResponse;
    try {
        searchData = JSON.parse(searchResponseText) as D7SearchResponse;
    } catch (e) {
        console.error(`D7 Search API Error: Could not parse JSON response from ${searchUrl}. Response: ${searchResponseText}`, e);
        throw new Error(`D7 Search API returned non-JSON response: ${searchResponseText}`);
    }
    
    console.log('D7 Search API Full Response:', JSON.stringify(searchData, null, 2));
        
    searchIdValue = searchData.searchid; // Corrected to 'searchid'

    if (searchData.wait_seconds) {
        console.warn(`D7 API suggests waiting for ${searchData.wait_seconds} seconds. Current fixed wait is 10 seconds.`);
        // Future improvement: use wait_seconds to dynamically adjust wait time or implement polling.
    }

    if (!searchIdValue) {
      // Check if leads are directly in the search response
      const directLeads = searchData.results || searchData.data;
      if (Array.isArray(directLeads) && directLeads.length > 0) {
        console.log(`D7 Search API returned ${directLeads.length} leads directly. Processing these leads.`);
        return directLeads.slice(0, limit).map(apiLead => transformD7ApiLeadToD7Lead(apiLead, keyword, cityname, countryCode));
      }
      
      const d7ApiMessage = searchData.message;
      if (d7ApiMessage) {
        console.error(`D7 Search API did not return a searchid. D7 message: ${d7ApiMessage}`, searchData);
        throw new Error(`D7 Search API error: ${d7ApiMessage}`);
      }
      
      // If no searchid, no direct leads, and no D7 message, throw the generic error including the D7 response
      const detailedErrorMsg = 'D7 Search API failed to provide a searchid and no direct leads were found. ' +
                               `Actual D7 Search Response was: ${JSON.stringify(searchData)}`;
      console.error(detailedErrorMsg, searchData);
      throw new Error(detailedErrorMsg);
    }

    // Determine wait time based on D7 suggested wait_seconds, with a minimum fallback
    const suggestedWaitSeconds = searchData.wait_seconds ? parseInt(String(searchData.wait_seconds), 10) : 0;
    const minWaitSeconds = 5; // Minimum wait time in seconds
    const actualWaitTimeMs = Math.max(suggestedWaitSeconds, minWaitSeconds) * 1000;

    console.log(`D7 Search ID obtained: ${searchIdValue}. Waiting for ${actualWaitTimeMs / 1000} seconds before fetching results...`);

    await new Promise(resolve => setTimeout(resolve, actualWaitTimeMs));

    const resultsParams = new URLSearchParams({
      id: String(searchIdValue), // Ensure searchIdValue is a string for URL
      key: apiKey,
    });
    const resultsUrl = `${D7_RESULTS_API_URL}?${resultsParams.toString()}`;
    
    console.log(`Fetching D7 Results from: ${resultsUrl}`);
    const resultsResponse = await fetchWithRetry(resultsUrl, { method: 'GET' });
    const resultsResponseText = await resultsResponse.text();

    if (!resultsResponse.ok) {
      let d7ErrorMsg = resultsResponseText;
      try {
        const errorJson = JSON.parse(resultsResponseText);
        d7ErrorMsg = errorJson.message || d7ErrorMsg;
      } catch (e) { /* ignore */ }
      console.error(`D7 Results API HTTP Error (${resultsResponse.status}) for URL ${resultsUrl} (Search ID: ${searchIdValue}). Response: ${d7ErrorMsg}`);
      throw new Error(`Failed to fetch results from D7 Lead Finder (HTTP ${resultsResponse.status}): ${d7ErrorMsg}`);
    }

    let resultsData: D7ResultsResponse;
    try {
        resultsData = JSON.parse(resultsResponseText) as D7ResultsResponse;
    } catch (e) {
        console.error(`D7 Results API Error: Could not parse JSON response from ${resultsUrl}. Response: ${resultsResponseText}`, e);
        throw new Error(`D7 Results API returned non-JSON response: ${resultsResponseText}`);
    }

    console.log('D7 Results API Full Response:', JSON.stringify(resultsData, null, 2));

    if (resultsData.status === 'error' && resultsData.message) {
        console.error(`D7 Results API returned error status: ${resultsData.message}`, resultsData);
        throw new Error(`D7 Results API error: ${resultsData.message}`);
    }
    
    if (resultsData.status === 'pending') {
        console.warn(`D7 Results for Search ID ${searchIdValue} are still pending. Returning empty for now. Consider increasing wait time or implementing polling.`);
        return []; // Return empty array if pending
    }

    // Check if the results are in data, results, or the root level
    let rawLeads: D7ApiLead[] = Array.isArray(resultsData)
        ? resultsData // Check if resultsData itself is an array
        : resultsData.data || resultsData.results || []; // Otherwise, check data or results properties

    if (!Array.isArray(rawLeads)) {
      console.warn(`D7 Results API response for Search ID ${searchIdValue} did not contain a recognized array of leads in 'data', 'results', or root. Found:`, typeof rawLeads, resultsData);
      rawLeads = []; // Default to empty array if structure is not as expected
    }
    
    console.log(`Received ${rawLeads.length} raw leads from D7 Results API for Search ID ${searchIdValue}.`);
    
    const transformedLeads = rawLeads.map(apiLead => transformD7ApiLeadToD7Lead(apiLead, keyword, cityname, countryCode));
    console.log(`Transformed ${transformedLeads.length} leads. Limiting to ${limit}.`);
    
    return transformedLeads.slice(0, limit);

  } catch (error: any) {
    console.error('Error in fetchLeadsFromD7:', error.message, error.stack);
    // Ensure the error message is informative if it's one of our specific D7 errors
    if (error.message.startsWith('D7 ') || error.message.startsWith('Failed to')) {
        throw error;
    }
    // For other errors, provide a generic message
    throw new Error(error.message || 'An unexpected error occurred while fetching D7 leads.');
  }
}

