import { NextResponse } from 'next/server';
import { generateAndStoreOAuthState } from '@/lib/auth-utils';
import { generateGhlOAuthUrl } from '@/lib/ghl/auth';

export async function GET(request: Request) {
  try {
    // 1. Generate and store a secure state parameter
    const state = await generateAndStoreOAuthState();

    // 2. Generate the GHL OAuth authorization URL
    const authorizationUrl = generateGhlOAuthUrl(state);

    console.log('Generated GHL authorization URL:', authorizationUrl);

    // 3. Return the URL to the frontend
    // The frontend will then redirect the user to this URL
    return NextResponse.json({ authorizationUrl });

  } catch (error: any) {
    console.error('Error initiating GHL OAuth flow:', error);
    // TODO: Return a more user-friendly error response to the frontend
    return NextResponse.json({ error: 'Failed to initiate GoHighLevel connection.' }, { status: 500 });
  }
} 