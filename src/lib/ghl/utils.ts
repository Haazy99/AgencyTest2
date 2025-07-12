import { getAccessToken } from '@/lib/auth-utils';
import { DEFAULT_HEADERS } from './constants';

/**
 * Get authenticated headers for GHL API requests
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error('No GHL access token found. Please connect to GoHighLevel first.');
  }

  return {
    'Authorization': `Bearer ${accessToken}`,
    ...DEFAULT_HEADERS,
  };
}

/**
 * Handle API response and extract data
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Provide specific error messages based on status code
    switch (response.status) {
      case 401:
        throw new Error(`Authentication failed: ${errorData.message || 'Invalid or expired access token'}`);
      case 403:
        throw new Error(`Permission denied: ${errorData.message || 'Insufficient permissions'}`);
      case 422:
        throw new Error(`Validation error: ${errorData.message || 'Invalid data provided'}`);
      case 429:
        throw new Error(`Rate limit exceeded: ${errorData.message || 'Too many requests, please try again later'}`);
      default:
        throw new Error(`API error (${response.status}): ${errorData.message || response.statusText}`);
    }
  }

  return response.json();
}

/**
 * Build query parameters from an object
 */
export function buildQueryParams(params: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  
  return queryParams;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on authentication or permission errors
      if (error.message.includes('Authentication failed') || 
          error.message.includes('Permission denied') ||
          error.message.includes('401') ||
          error.message.includes('403')) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
} 