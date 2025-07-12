// Interface for GHL Location (Sub-Account)
export interface GHLLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  companyId: string;
}

// Interface for GHL Contact
export interface GHLContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  companyName?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// Interface for GHL Contact Response
export interface GHLContactResponse {
  contact: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    locationId: string;
    [key: string]: any;
  };
}

// Interface for contact search parameters
export interface GHLContactSearchParams {
  email?: string;
  phone?: string;
  query?: string;
  limit?: number;
}

// Interface for GHL token response (from auth.ts)
export interface GhlTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  userType: string;
  companyId: string;
  userId: string;
  locationId?: string;
} 