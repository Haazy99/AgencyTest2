import { NextRequest, NextResponse } from 'next/server';
import { createGHLContact, searchGHLContacts, getGHLContact, type GHLContact } from '@/lib/ghl/api';
import type { D7Lead, SmartMapping } from '@/types';

interface ExportLeadRequest {
  lead: D7Lead;
  locationId: string;
  mapping: SmartMapping;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportLeadRequest = await request.json();
    const { lead, locationId } = body;

    if (!lead || !locationId) {
      return NextResponse.json(
        { error: 'Lead data and location ID are required' },
        { status: 400 }
      );
    }

    console.log('Exporting lead to GHL location:', locationId);
    console.log('Lead data:', lead);

    // Use direct field mapping only
    const ghlContact: GHLContact = {
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      address1: lead.address || undefined,
      city: lead.city || undefined,
      state: lead.state || undefined,
      postalCode: lead.postalCode || undefined,
      website: lead.website || undefined,
      companyName: lead.companyName || undefined
    };

    // Create contact in GHL
    const contactId = await createGHLContact(locationId, ghlContact);

    return NextResponse.json({
      success: true,
      contactId,
      message: 'Contact created successfully'
    });

  } catch (error: any) {
    console.error('Error exporting lead:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to export lead',
        details: error.stack
      },
      { status: 500 }
    );
  }
} 