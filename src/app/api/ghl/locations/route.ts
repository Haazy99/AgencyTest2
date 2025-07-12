import { NextResponse } from 'next/server';
import { fetchGHLLocations } from '@/lib/ghl/api';

export async function GET() {
  try {
    const locations = await fetchGHLLocations();
    
    // Transform to match the existing GHLSubAccount interface
    const subAccounts = locations.map(location => ({
      id: location.id,
      name: location.name,
    }));

    return NextResponse.json({ subAccounts });
  } catch (error: any) {
    console.error('Error fetching GHL locations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GHL sub-accounts' },
      { status: 500 }
    );
  }
} 