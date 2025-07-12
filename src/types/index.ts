export interface GHLSubAccount {
  id: string;
  name: string;
}

// Based on the D7 fields mentioned in smart-mapping and common lead fields
export interface D7Lead {
  id: string; // Added for unique identification in lists
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  website?: string | null;
  address?: string | null; // Could be full address or street
  city?: string | null;
  state?: string | null; // Or province
  zipCode?: string | null; // Or postal code
  country?: string | null;
  category?: string | null; // e.g., "Plumbers"
  // Facebook-related fields
  facebookPage?: string;
  facebookPageStatus?: 'active' | 'inaccessible';
  facebookPageError?: string;
  // Ad-related fields
  hasActiveAds?: boolean;
  adLibraryUrl?: string;
  lastAdScanDate?: string;
  // Allow any other string properties from D7
  [key: string]: any | null;
}

export type SmartMapping = Record<string, string>;

// Apify scan result interface
export interface FacebookAdScanResult {
  pageUrl: string;
  hasActiveAds: boolean;
  adLibraryUrl: string;
  scannedAt: string;
  facebookPageStatus?: 'active' | 'inaccessible';
  facebookPageError?: string;
}
