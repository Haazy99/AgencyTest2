import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { deflate, inflate } from 'zlib';
import { promisify } from 'util';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

// Define the session data structure - keep it minimal to avoid cookie size issues
export interface SessionData {
  oauthState?: string;
  ghlConnected?: boolean;
  ghlCompanyId?: string;
  ghlUserId?: string;
  ghlTokenExpiryTimestamp?: number;
  // Store tokens in compressed format to avoid cookie size issues
  ghlTokenData?: string; // Compressed and Base64 encoded JSON of token data
  // Fallback: store session ID if tokens are too large for cookies
  sessionId?: string;
}

// Define the session options
const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string, // Must be at least 32 characters long
  cookieName: 'ghl_oauth_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevent XSS attacks
    sameSite: 'lax', // Allow cookies in OAuth redirects
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  ttl: 60 * 60 * 24 * 30, // 30 days TTL for the session
};

// Helper to get the session
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Function to generate and store the OAuth state
export async function generateAndStoreOAuthState(): Promise<string> {
  const session = await getSession();
  const state = uuidv4();
  session.oauthState = state;
  await session.save();
  console.log('Generated and stored OAuth state:', state);
  return state;
}

// Function to validate and clear the OAuth state
export async function validateAndClearOAuthState(state: string | null): Promise<boolean> {
  const session = await getSession();
  const storedState = session.oauthState;
  console.log('Validating OAuth state. Received:', state, 'Stored:', storedState);

  // Always clear the oauthState after attempting validation
  session.oauthState = undefined;
  await session.save();

  if (!state || !storedState || state !== storedState) {
    return false;
  }

  console.log('OAuth state validated.');
  return true;
}

// Helper function to redirect on state validation failure
export async function redirectToStateError(message = 'Invalid OAuth state') {
  console.error('Redirecting due to state error:', message);
  redirect(`/error?message=${encodeURIComponent(message)}`);
}

// Token storage interface
interface TokenData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiryTimestamp: number;
}

// Maximum cookie size we want to stay under (leaving room for other session data)
const MAX_COOKIE_SIZE = 3500; // bytes

// Helper functions for aggressive token compression
async function compressTokenData(tokens: TokenData): Promise<string> {
  try {
    // Create a very compact representation with minimal field names
    const compact = {
      a: tokens.accessToken,
      r: tokens.refreshToken,
      t: tokens.tokenType,
      e: tokens.expiresIn,
      x: tokens.expiryTimestamp
    };
    
    // Convert to JSON and compress with zlib
    const jsonString = JSON.stringify(compact);
    const compressed = await deflateAsync(Buffer.from(jsonString, 'utf8'));
    const base64Compressed = compressed.toString('base64');
    
    console.log('Token compression stats:', {
      original: jsonString.length,
      compressed: base64Compressed.length,
      ratio: Math.round((1 - base64Compressed.length / jsonString.length) * 100) + '%'
    });
    
    return base64Compressed;
  } catch (error) {
    console.error('Error compressing token data:', error);
    throw new Error('Failed to compress token data');
  }
}

async function decompressTokenData(compressed: string): Promise<TokenData> {
  try {
    const compressedBuffer = Buffer.from(compressed, 'base64');
    const decompressed = await inflateAsync(compressedBuffer);
    const compact = JSON.parse(decompressed.toString('utf8'));
    
    return {
      accessToken: compact.a,
      refreshToken: compact.r,
      tokenType: compact.t,
      expiresIn: compact.e,
      expiryTimestamp: compact.x
    };
  } catch (error) {
    console.error('Error decompressing token data:', error);
    throw new Error('Failed to decompress token data');
  }
}

// In-memory storage for large tokens (with session ID reference)
const tokenStore = new Map<string, TokenData>();

// Store tokens with aggressive compression and fallback
export async function storeTokens(companyId: string, userId: string, tokens: {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}): Promise<void> {
  const session = await getSession();
  const expiryTimestamp = Math.floor(Date.now() / 1000) + tokens.expires_in;
  
  const tokenData: TokenData = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenType: tokens.token_type,
    expiresIn: tokens.expires_in,
    expiryTimestamp,
  };

  try {
    // Try aggressive compression first
    const compressedTokens = await compressTokenData(tokenData);
    
    // Estimate total session size
    const sessionDataSize = JSON.stringify({
      ghlConnected: true,
      ghlCompanyId: companyId,
      ghlUserId: userId,
      ghlTokenExpiryTimestamp: expiryTimestamp,
      ghlTokenData: compressedTokens
    }).length;
    
    console.log('Estimated session size:', sessionDataSize, 'bytes');
    
    if (sessionDataSize < MAX_COOKIE_SIZE) {
      // Store compressed tokens directly in session
      session.ghlConnected = true;
      session.ghlCompanyId = companyId;
      session.ghlUserId = userId;
      session.ghlTokenExpiryTimestamp = expiryTimestamp;
      session.ghlTokenData = compressedTokens;
      session.sessionId = undefined; // Clear any existing session ID
      
      await session.save();
      
      console.log('Stored compressed tokens in session for company/user:', companyId, userId);
      console.log('Compressed token size:', compressedTokens.length, 'bytes');
      return;
    }
  } catch (error: any) {
    console.error('Error with token compression:', error);
  }
  
  // Fallback: Use session ID reference for very large tokens
  console.log('Tokens too large for session, using session ID fallback');
  
  const sessionId = uuidv4();
  tokenStore.set(sessionId, tokenData);
  
  // Store minimal data in session with session ID reference
  session.ghlConnected = true;
  session.ghlCompanyId = companyId;
  session.ghlUserId = userId;
  session.ghlTokenExpiryTimestamp = expiryTimestamp;
  session.ghlTokenData = undefined; // Clear any existing token data
  session.sessionId = sessionId;
  
  await session.save();
  
  console.log('Stored tokens in memory with session ID:', sessionId, 'for company/user:', companyId, userId);
}

// Retrieve tokens from session or memory
export async function getTokens(companyId: string, userId: string): Promise<TokenData | null> {
  const session = await getSession();
  
  // Check if session is valid and matches the requested company/user
  if (!session.ghlConnected || 
      session.ghlCompanyId !== companyId || 
      session.ghlUserId !== userId ||
      !session.ghlTokenExpiryTimestamp) {
    return null;
  }

  // Check if tokens are expired
  const now = Math.floor(Date.now() / 1000);
  if (now >= session.ghlTokenExpiryTimestamp) {
    console.log('Tokens expired, clearing session');
    await clearTokensFromSession();
    return null;
  }

  // Try to get tokens from session first (compressed)
  if (session.ghlTokenData) {
    try {
      const tokens = await decompressTokenData(session.ghlTokenData);
      console.log('Retrieved compressed tokens from session successfully');
      return tokens;
    } catch (error) {
      console.error('Error decompressing tokens from session:', error);
      // Continue to fallback methods
    }
  }

  // Fallback: try to get tokens from memory using session ID
  if (session.sessionId) {
    const tokens = tokenStore.get(session.sessionId);
    if (tokens) {
      console.log('Retrieved tokens from memory using session ID');
      return tokens;
    } else {
      console.log('No tokens found for session ID:', session.sessionId);
    }
  }

  console.log('No tokens found for company/user:', companyId, userId);
  return null;
}

// Clear tokens from session and memory
export async function clearTokensFromSession(): Promise<void> {
  const session = await getSession();
  
  // Clear tokens from memory if session ID exists
  if (session.sessionId) {
    tokenStore.delete(session.sessionId);
  }
  
  // Clear session data
  session.ghlConnected = false;
  session.ghlCompanyId = undefined;
  session.ghlUserId = undefined;
  session.ghlTokenExpiryTimestamp = undefined;
  session.ghlTokenData = undefined;
  session.sessionId = undefined;
  
  await session.save();
  
  console.log('Cleared tokens from session and memory storage');
}

// Clear tokens (both session and memory)
export async function clearTokens(companyId: string, userId: string): Promise<void> {
  await clearTokensFromSession();
  console.log('Cleared tokens for company/user:', companyId, userId);
}

// Helper to get access token from session
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  
  console.log('Getting access token. Session state:', {
    ghlConnected: session.ghlConnected,
    hasCompanyId: !!session.ghlCompanyId,
    hasUserId: !!session.ghlUserId,
    hasTokenData: !!session.ghlTokenData,
    hasSessionId: !!session.sessionId,
    tokenExpiry: session.ghlTokenExpiryTimestamp
  });
  
  if (!session.ghlConnected || !session.ghlCompanyId || !session.ghlUserId) {
    console.log('Session not properly connected or missing required data');
    return null;
  }
  
  // Check token expiry first
  if (session.ghlTokenExpiryTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= session.ghlTokenExpiryTimestamp) {
      console.log('Session token expired, clearing session');
      await clearTokensFromSession();
      return null;
    }
  }
  
  // Get tokens using the getTokens function
  const tokens = await getTokens(session.ghlCompanyId, session.ghlUserId);
  
  if (!tokens) {
    console.log('No tokens found, clearing session');
    await clearTokensFromSession();
    return null;
  }
  
  console.log('Retrieved access token successfully');
  return tokens.accessToken;
} 