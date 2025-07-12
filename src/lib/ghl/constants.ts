// GHL API Base URLs
export const GHL_API_BASE = 'https://services.leadconnectorhq.com';
export const GHL_AUTHORIZATION_URL = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
export const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

// API Version
export const GHL_API_VERSION = '2021-07-28';

// Default headers for GHL API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Version': GHL_API_VERSION,
};

// OAuth scopes
export const GHL_OAUTH_SCOPES = [
  'contacts.readonly',
  'contacts.write',
  'locations.readonly',
  'locations.write',
  'opportunities.readonly',
  'opportunities.write',
  'oauth.readonly',
  'oauth.write'
].join(' ');

// API Limits
export const DEFAULT_LOCATION_LIMIT = 100;
export const DEFAULT_CONTACT_LIMIT = 50; 