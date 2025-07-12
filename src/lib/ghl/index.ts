// Main entry point for the GHL module
// This file re-exports everything from the api module for backward compatibility
// and provides a clean interface for importing GHL functionality

export * from './api';

// You can also import specific modules if needed:
// import { fetchGHLLocations } from '@/lib/ghl/locations';
// import { createGHLContact } from '@/lib/ghl/contacts';
// import { GHLContact } from '@/lib/ghl/types'; 