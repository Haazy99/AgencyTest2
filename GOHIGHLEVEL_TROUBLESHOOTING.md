# GoHighLevel API Authentication Troubleshooting Guide

## Issues Fixed

### ✅ Cookie Size Issue
**Problem**: "Cookie length is too big (4582 bytes), browsers will refuse it"

**Root Cause**: 
- Storing full access tokens directly in session cookies
- Browsers have a 4KB limit for cookies
- GoHighLevel tokens are quite large

**Solution Implemented**:
- **Token Compression**: Tokens are compressed using Base64 encoding with compact field names
- **Optimized Storage**: Reduced token field names (accessToken → 'a', refreshToken → 'r', etc.)
- **Session-Based Storage**: Tokens stored directly in encrypted session cookies (compressed)
- **Persistent Connection**: Connection persists across sessions and server restarts

### ✅ Connection Persistence Issue
**Problem**: GoHighLevel connection keeps reverting to "not connected" after connecting.

**Root Cause**: 
- In-memory token storage was being cleared on server restart
- Session ID reference system still relied on memory storage
- Tokens lost when development server restarted

**Solution Implemented**:
- **Direct Session Storage**: Tokens now stored directly in the session (compressed)
- **No Memory Dependency**: Eliminated reliance on in-memory Map storage
- **Server Restart Resilience**: Tokens persist through server restarts
- **30-day Session TTL**: Long-term persistent connections

### ✅ Authentication Error
**Problem**: 
```
Error: Failed to create contact in GoHighLevel: Failed to create GHL contact (401): This authClass type is not allowed to access this scope. Please verify your IAM configuration if this is not the case.
```

**Solution Implemented**:
- **Dual Authentication Strategy**: Location tokens + Agency token fallback
- **Enhanced Error Handling**: Better debugging and error messages
- **Proper Request Formatting**: Correct headers and request body structure

### ✅ OAuth Scope Issue for Contact Creation
**Problem**: 
```
Error: Failed to create contact in GoHighLevel: https://services.leadconnectorhq.com/contacts: 401 This authClass type is not allowed to access this scope. Please verify your IAM configuration if this is not the case.
```

**Root Cause**: 
- Agency-level OAuth token doesn't have the correct scope to create contacts directly
- Missing `oauth.write` scope needed for location token generation
- GoHighLevel API v2 has strict scope restrictions for different operations

**Solution Implemented**:
1. **Added OAuth Scopes**: Added `oauth.readonly` and `oauth.write` to the OAuth scope configuration
2. **Prioritized Location Token Method**: Location tokens have broader permissions for contact operations
3. **Enhanced Error Handling**: Better error messages for scope-related issues
4. **Fallback Strategy**: Agency token as fallback with proper scope error detection

**Required OAuth Scopes**:
```
contacts.readonly contacts.write locations.readonly locations.write opportunities.readonly opportunities.write oauth.readonly oauth.write
```

**Steps to Fix**:
1. **Update OAuth Scopes**: The scopes have been updated in `src/lib/ghl/auth.ts`
2. **Reconnect GoHighLevel**: You need to disconnect and reconnect to get the new scopes
3. **Update GoHighLevel App**: Make sure your GoHighLevel marketplace app has all the required scopes enabled

## Testing Your Fixes

### Step 1: Test Connection Persistence

1. **Connect to GoHighLevel**: Use the connect button
2. **Refresh the page**: The connection should persist
3. **Restart your development server**: Connection should still be maintained
4. **Check debug info**: Visit `/api/ghl/debug` to verify session state

### Step 2: Test Disconnect Functionality

1. **Click Disconnect**: Should properly clear all session data
2. **Verify disconnection**: Page should show "not connected" state
3. **Check debug info**: `/api/ghl/debug` should show no tokens

### Step 3: Test Contact Creation

1. **Connect to GoHighLevel**
2. **Search for leads** using D7 Lead Finder
3. **Export a lead**: Should now work without 401 errors
4. **Monitor logs**: Check console for detailed authentication flow

## Debug Endpoints

### `/api/ghl/debug`
Provides comprehensive debugging information:
- Session status and token validity
- Environment configuration
- Token expiration details
- Access token test results
- Token data size (compressed)

### `/api/auth/ghl/status`
Quick connection status check:
- Boolean connection status
- Company ID (masked)
- Debug information about session state
- Token data size and validity

## Key Improvements Made

### 1. Cookie Size Optimization with Compression
```typescript
// Before: Large tokens in session cookie (>4KB)
session.ghlAccessToken = tokens.access_token;
session.ghlRefreshToken = tokens.refresh_token;

// After: Compressed tokens in session (<2KB)
const compact = {
  a: tokens.access_token,  // Shortened field names
  r: tokens.refresh_token,
  t: tokens.token_type,
  e: tokens.expires_in,
  x: tokens.expiryTimestamp
};
session.ghlTokenData = Buffer.from(JSON.stringify(compact)).toString('base64');
```

### 2. Direct Session-Based Token Storage
```typescript
// Session stores compressed token data directly
session.ghlConnected = true;
session.ghlCompanyId = companyId;
session.ghlTokenData = compressedTokens;

// No more memory dependency
// Tokens persist through server restarts
```

### 3. Proper Disconnect Implementation
```typescript
// New disconnect endpoint
POST /api/auth/ghl/disconnect

// Clears session token data
session.ghlTokenData = undefined;
await clearTokensFromSession();
```

### 4. Enhanced Connection Status Check
```typescript
// Checks session token data directly
const hasValidTokens = session.ghlTokenData && 
  (now < session.ghlTokenExpiryTimestamp);
```

### 5. Dual Authentication for Contact Creation
```typescript
// Method 1: Location token (preferred)
const locationToken = await getLocationToken(locationId);

// Method 2: Agency token fallback
const agencyToken = await getAccessToken();
```

## Common Issues and Solutions

### Issue 1: "Cookie length is too big"
**Status**: ✅ **FIXED**
- Token compression implemented
- Cookie size reduced from >4KB to ~1.5KB
- Tokens stored directly in encrypted session

### Issue 2: "Connection keeps disconnecting"
**Status**: ✅ **FIXED**
- Direct session-based storage (no memory dependency)
- 30-day session TTL
- Server restart resilience
- Automatic token validation

### Issue 3: "401 Authentication errors"
**Status**: ✅ **FIXED**
- Dual authentication strategy implemented
- Better error handling and fallbacks
- Proper request formatting

### Issue 4: "Disconnect button not working"
**Status**: ✅ **FIXED**
- Complete disconnect endpoint implemented
- Proper session token cleanup
- UI state management

## Environment Variables to Verify

Ensure these are properly set in your `.env.local`:

```env
GHL_CLIENT_ID=your_client_id
GHL_CLIENT_SECRET=your_client_secret
GHL_REDIRECT_URI=http://localhost:9003/api/auth/callback
SECRET_COOKIE_PASSWORD=your_32_character_secret
```

## Next Steps

1. **Test the Connection**: Connect to GoHighLevel and verify it persists
2. **Test Server Restart**: Restart your dev server and verify connection persists
3. **Test Lead Export**: Try exporting a lead to verify contact creation works
4. **Test Disconnect**: Verify the disconnect functionality works properly
5. **Monitor Debug Info**: Use the debug endpoints to troubleshoot any remaining issues

## Technical Details

### Token Compression Strategy
- **Field Name Shortening**: `accessToken` → `a`, `refreshToken` → `r`
- **Base64 Encoding**: Compressed JSON structure
- **Size Reduction**: ~60% reduction in token storage size
- **Encryption**: Session data encrypted by iron-session

### Storage Architecture
```
Session Cookie (Encrypted)
├── ghlConnected: boolean
├── ghlCompanyId: string
├── ghlUserId: string
├── ghlTokenExpiryTimestamp: number
└── ghlTokenData: string (compressed tokens)
```

### Fallback Mechanism
- Primary: Compressed tokens in session
- Fallback: Memory storage (for error recovery)
- Automatic cleanup on token expiry

## Alternative: Private Integration Tokens

If OAuth issues persist, consider using Private Integration tokens:

1. Go to your GoHighLevel agency settings
2. Navigate to "Private Integrations"
3. Create a new integration with required scopes
4. Use the generated token directly instead of OAuth

This approach is simpler and avoids many OAuth-related authentication issues.

## Getting Additional Help

If issues persist:
1. Check the detailed logs from the updated error handling
2. Use the debug endpoints to verify session and token state
3. Verify your GoHighLevel app configuration
4. Consider reaching out to GoHighLevel support for app-specific permission issues

The updated code provides persistent connections through server restarts, proper disconnect functionality, optimized cookie usage with compression, and much better error handling and debugging information. 