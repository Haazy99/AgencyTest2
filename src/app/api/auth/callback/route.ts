import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/ghl/auth';
import { validateAndClearOAuthState, redirectToStateError, getSession, storeTokens } from '@/lib/auth-utils';
// You'll also need a way to securely store and retrieve the 'state' parameter generated earlier
// import { validateOAuthState, clearOAuthState } from '@/lib/auth-utils'; // Placeholder

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Validate the state parameter to prevent CSRF attacks
  const isStateValid = await validateAndClearOAuthState(state);
  if (!isStateValid) {
    return redirectToStateError();
  }

  if (!code) {
    // Handle the case where the user denies the authorization request
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    console.error('GHL OAuth Error:', error, errorDescription);
    // TODO: Redirect to an error page with a user-friendly message
    // For popup OAuth flow, we need to send an error message to the parent window
    const denialHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Denied</title>
        </head>
        <body>
          <script>
            // Send error message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'GHL_OAUTH_ERROR',
                message: 'Authorization was denied or failed: ${errorDescription || error || 'User cancelled'}'
              }, window.location.origin);
              window.close();
            } else {
              // Fallback for non-popup flow
              window.location.href = '/error?message=GHL authorization denied or failed.';
            }
          </script>
          <p>Authorization denied. This window will close automatically.</p>
        </body>
      </html>
    `;
    
    return new Response(denialHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Add check for state parameter
  if (!state) {
    console.error('GHL OAuth Error: Missing state parameter');
    return NextResponse.redirect('/error?message=Missing state parameter');
  }

  try {
    // Exchange the authorization code for tokens
    const tokens = await exchangeCodeForTokens(code!, state!);

    // Store tokens in secure session storage
    await storeTokens(tokens.companyId, tokens.userId, tokens);

    console.log('Successfully obtained and stored GHL tokens for company:', tokens.companyId);

    // Success response for popup OAuth flow
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
        </head>
        <body>
          <script>
            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'GHL_OAUTH_SUCCESS',
                message: 'GoHighLevel account connected successfully!'
              }, window.location.origin);
              window.close();
            } else {
              // Fallback for non-popup flow
              window.location.href = '/?message=GHL account connected successfully!';
            }
          </script>
          <p>Connection successful! This window will close automatically.</p>
        </body>
      </html>
    `;
    
    return new Response(successHtml, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('Error during GHL token exchange or storage:', error);
    // TODO: Redirect to an error page
    // For popup OAuth flow, we need to send an error message to the parent window
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
        </head>
        <body>
          <script>
            // Send error message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'GHL_OAUTH_ERROR',
                message: 'Failed to connect GHL account: ${error.message || error}'
              }, window.location.origin);
              window.close();
            } else {
              // Fallback for non-popup flow
              window.location.href = '/error?message=Failed to connect GHL account: ${error.message || error}';
            }
          </script>
          <p>Connection failed. This window will close automatically.</p>
        </body>
      </html>
    `;
    
    return new Response(errorHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
} 