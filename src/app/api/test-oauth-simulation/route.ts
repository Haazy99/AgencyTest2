import { NextRequest, NextResponse } from 'next/server';
import { storeTokens, getSession } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('Simulating OAuth callback with test tokens...');
    
    // Simulate the tokens that would come from GoHighLevel
    const simulatedTokens = {
      access_token: 'simulated_access_token_' + Date.now(),
      refresh_token: 'simulated_refresh_token_' + Date.now(),
      token_type: 'Bearer',
      expires_in: 3600
    };

    const companyId = 'simulated-company-' + Date.now();
    const userId = 'simulated-user-' + Date.now();
    
    // Store the tokens (this is what the OAuth callback does)
    await storeTokens(companyId, userId, simulatedTokens);
    
    console.log('Simulated tokens stored successfully');
    
    // Return HTML that can be opened in a browser to test session persistence
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Simulation Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .success { color: green; }
            .info { color: blue; }
            button { padding: 10px 20px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>OAuth Simulation Test</h1>
          <p class="success">✅ Simulated tokens have been stored in session!</p>
          <p class="info">Company ID: ${companyId}</p>
          <p class="info">User ID: ${userId}</p>
          
          <h2>Test Session Persistence</h2>
          <p>Click the button below to test if the session data persists:</p>
          <button onclick="testSession()">Test Session Status</button>
          <div id="result"></div>
          
          <script>
            async function testSession() {
              const resultDiv = document.getElementById('result');
              resultDiv.innerHTML = '<p>Testing...</p>';
              
              try {
                const response = await fetch('/api/auth/ghl/status');
                const data = await response.json();
                
                resultDiv.innerHTML = \`
                  <h3>Session Test Result:</h3>
                  <p><strong>Connected:</strong> \${data.isConnected ? '✅ YES' : '❌ NO'}</p>
                  <p><strong>Company ID:</strong> \${data.debug.hasCompanyId ? '✅ Found' : '❌ Missing'}</p>
                  <p><strong>User ID:</strong> \${data.debug.hasUserId ? '✅ Found' : '❌ Missing'}</p>
                  <p><strong>Token Data:</strong> \${data.debug.hasTokenData ? '✅ Found' : '❌ Missing'}</p>
                  <p><strong>Token Size:</strong> \${data.debug.tokenDataSize} bytes</p>
                  <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
              } catch (error) {
                resultDiv.innerHTML = \`<p style="color: red;">Error: \${error.message}</p>\`;
              }
            }
          </script>
        </body>
      </html>
    `;
    
    return new Response(testHtml, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('Error in OAuth simulation test:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to simulate OAuth',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Simulating OAuth callback with test tokens...');
    
    // Simulate the tokens that would come from GoHighLevel
    const simulatedTokens = {
      access_token: 'simulated_access_token_' + Date.now(),
      refresh_token: 'simulated_refresh_token_' + Date.now(),
      token_type: 'Bearer',
      expires_in: 3600
    };

    const companyId = 'simulated-company-' + Date.now();
    const userId = 'simulated-user-' + Date.now();
    
    // Store the tokens (this is what the OAuth callback does)
    await storeTokens(companyId, userId, simulatedTokens);
    
    console.log('Simulated tokens stored successfully');
    
    // Return HTML that can be opened in a browser to test session persistence
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Simulation Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .success { color: green; }
            .info { color: blue; }
            button { padding: 10px 20px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>OAuth Simulation Test</h1>
          <p class="success">✅ Simulated tokens have been stored in session!</p>
          <p class="info">Company ID: ${companyId}</p>
          <p class="info">User ID: ${userId}</p>
          
          <h2>Test Session Persistence</h2>
          <p>Click the button below to test if the session data persists:</p>
          <button onclick="testSession()">Test Session Status</button>
          <div id="result"></div>
          
          <script>
            async function testSession() {
              const resultDiv = document.getElementById('result');
              resultDiv.innerHTML = '<p>Testing...</p>';
              
              try {
                const response = await fetch('/api/auth/ghl/status');
                const data = await response.json();
                
                resultDiv.innerHTML = \`
                  <h3>Session Test Result:</h3>
                  <p><strong>Connected:</strong> \${data.isConnected ? '✅ YES' : '❌ NO'}</p>
                  <p><strong>Company ID:</strong> \${data.debug.hasCompanyId ? '✅ Found' : '❌ Missing'}</p>
                  <p><strong>User ID:</strong> \${data.debug.hasUserId ? '✅ Found' : '❌ Missing'}</p>
                  <p><strong>Token Data:</strong> \${data.debug.hasTokenData ? '✅ Found' : '❌ Missing'}</p>
                  <p><strong>Token Size:</strong> \${data.debug.tokenDataSize} bytes</p>
                  <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
              } catch (error) {
                resultDiv.innerHTML = \`<p style="color: red;">Error: \${error.message}</p>\`;
              }
            }
          </script>
        </body>
      </html>
    `;
    
    return new Response(testHtml, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('Error in OAuth simulation test:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to simulate OAuth',
        details: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 