import type { GhlTokenResponse } from "./types";
import { GHL_AUTHORIZATION_URL, GHL_TOKEN_URL, GHL_OAUTH_SCOPES } from "./constants";

// Function to generate the GHL OAuth authorization URL
export function generateGhlOAuthUrl(state: string): string {
  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Missing GHL_CLIENT_ID or GHL_REDIRECT_URI environment variable.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GHL_OAUTH_SCOPES,
    state: state,
    // PKCE parameters (code_challenge and code_challenge_method) should also be included for public clients
    // This requires generating a code_verifier and challenge client-side and storing the verifier for the callback.
  });

  return `${GHL_AUTHORIZATION_URL}?${params.toString()}`;
}

// Function to exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string, state: string): Promise<GhlTokenResponse> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GHL_CLIENT_ID, GHL_CLIENT_SECRET, or GHL_REDIRECT_URI environment variable for token exchange.");
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  // state parameter is usually not sent back in the token exchange request body or params, but we validated it already.

  console.log('Attempting to exchange code for tokens with GHL...', GHL_TOKEN_URL);

  try {
    const response = await fetch(GHL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('GHL Token Exchange Error Response:', response.status, data);
      throw new Error(`GHL Token Exchange failed (HTTP ${response.status}): ${data.message || data.error || JSON.stringify(data)}`);
    }

    console.log('GHL Token Exchange Successful. Received:', data);

    // Validate the response data against the expected type
    // A more robust implementation might use a validation library like Zod here.
    if (!data.access_token || !data.refresh_token || !data.expires_in || !data.userType || !data.companyId || !data.userId) {
        console.error('GHL Token Exchange Response Missing Required Fields:', data);
        throw new Error('GHL Token Exchange response missing required fields.');
    }

    return data as GhlTokenResponse;

  } catch (error: any) {
    console.error('Error during GHL token exchange:', error);
    throw new Error(`Failed to exchange GHL authorization code for tokens: ${error.message || error}`);
  }
}

// Function to refresh tokens
// This will be implemented later
export async function refreshGhlToken(refreshToken: string): Promise<GhlTokenResponse> {
  // Implementation for token refresh will go here
  throw new Error("refreshGhlToken not yet implemented.");
} 