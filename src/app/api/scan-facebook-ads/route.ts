import { NextRequest, NextResponse } from 'next/server';
import { FacebookScanner } from '@/lib/apify/facebook-scanner';
import type { D7Lead } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const token = process.env.APIFY_API_TOKEN;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Apify API token is not configured' },
        { status: 500 }
      );
    }

    if (!token.startsWith('apify_api_')) {
      return NextResponse.json(
        { error: 'Invalid Apify API token format' },
        { status: 500 }
      );
    }

    const data = await request.json();
    const leads: D7Lead[] = data.leads;

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json(
        { error: 'Invalid request: leads array is required' },
        { status: 400 }
      );
    }

    // Filter leads with Facebook pages
    const leadsWithFacebook = leads.filter(lead => lead.facebookPage);
    
    if (leadsWithFacebook.length === 0) {
      return NextResponse.json(
        { error: 'No Facebook pages found in leads' },
        { status: 400 }
      );
    }

    // Initialize scanner and scan pages
    const scanner = new FacebookScanner();
    const results = await scanner.scanPages(leadsWithFacebook);

    // Debug: Log scanner results
    console.log('Scanner results:', results.map(r => ({
      facebookPage: r.facebookPage,
      adLibraryUrl: r.adLibraryUrl,
      hasActiveAds: r.hasActiveAds,
      status: r.facebookPageStatus
    })));

    // Create a map of results by Facebook page URL (case insensitive)
    const resultsMap = new Map(
      results
        .filter(r => r.facebookPage)
        .map(r => [r.facebookPage!.toLowerCase(), r])
    );

    // Debug: Log the results map keys
    console.log('Results map keys:', Array.from(resultsMap.keys()));

    // Update leads with scan results
    const updatedLeads = leads.map((lead: D7Lead) => {
      if (!lead.facebookPage) return lead;
      
      const result = resultsMap.get(lead.facebookPage.toLowerCase());
      
      // Debug: Log the lookup process
      console.log('Looking up lead:', {
        leadId: lead.id,
        facebookPage: lead.facebookPage,
        foundResult: !!result,
        resultAdLibraryUrl: result?.adLibraryUrl
      });

      if (!result) return lead;

      const updatedLead = {
        ...lead,
        hasActiveAds: result.hasActiveAds,
        adLibraryUrl: result.adLibraryUrl,
        facebookPageStatus: result.facebookPageStatus,
        facebookPageError: result.facebookPageError,
        lastAdScanDate: result.lastAdScanDate
      };

      // Debug: Log if the updated lead has a localhost URL
      if (updatedLead.adLibraryUrl?.includes('localhost')) {
        console.error('Updated lead has localhost URL:', {
          id: updatedLead.id,
          companyName: updatedLead.companyName,
          facebookPage: updatedLead.facebookPage,
          adLibraryUrl: updatedLead.adLibraryUrl,
          originalResultUrl: result.adLibraryUrl
        });
      }

      return updatedLead;
    });

    // Final check for localhost URLs
    const problematicLeads = updatedLeads.filter(lead => lead.adLibraryUrl?.includes('localhost'));
    if (problematicLeads.length > 0) {
      console.error('Found leads with localhost URLs after update:', problematicLeads.map(lead => ({
        id: lead.id,
        companyName: lead.companyName,
        facebookPage: lead.facebookPage,
        adLibraryUrl: lead.adLibraryUrl
      })));
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        results: updatedLeads
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );

  } catch (error: any) {
    console.error('Error scanning Facebook ads:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scan Facebook ads',
        details: error.stack
      },
      { status: 500 }
    );
  }
} 