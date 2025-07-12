# GoHighLevel API Module

This module provides a clean, modular interface for interacting with the GoHighLevel API. The module has been refactored into smaller, focused files for better maintainability and organization.

## Module Structure

```
src/lib/ghl/
├── index.ts          # Main entry point (re-exports everything)
├── api.ts            # Main API module (re-exports from other modules)
├── types.ts          # TypeScript interfaces and types
├── constants.ts      # API constants and configuration
├── utils.ts          # Common utilities and helpers
├── auth.ts           # Authentication functions
├── locations.ts      # Location-related API functions
├── contacts.ts       # Contact-related API functions
└── README.md         # This documentation
```

## Usage

### Basic Import (Recommended)
```typescript
import { createGHLContact, fetchGHLLocations, GHLContact } from '@/lib/ghl';
```

### Specific Module Imports
```typescript
import { createGHLContact } from '@/lib/ghl/contacts';
import { fetchGHLLocations } from '@/lib/ghl/locations';
import { GHLContact } from '@/lib/ghl/types';
```

## Available Functions

### Location Functions (`locations.ts`)
- `fetchGHLLocations()` - Fetch all locations (sub-accounts) for the connected agency
- `getLocationToken(locationId)` - Get location-specific token

### Contact Functions (`contacts.ts`)
- `createGHLContact(locationId, contactData)` - Create a new contact
- `searchGHLContacts(locationId, searchParams)` - Search for contacts
- `getGHLContact(contactId, locationId)` - Get a specific contact by ID

### Authentication Functions (`auth.ts`)
- `generateGhlOAuthUrl(state)` - Generate OAuth authorization URL

### Utility Functions (`utils.ts`)
- `getAuthHeaders()` - Get authenticated headers for API requests
- `handleApiResponse(response)` - Handle API responses with proper error handling
- `buildQueryParams(params)` - Build URL query parameters
- `retryWithBackoff(fn, maxRetries, baseDelay)` - Retry function with exponential backoff

## Types

### Main Interfaces
- `GHLLocation` - Location/sub-account interface
- `GHLContact` - Contact data interface
- `GHLContactResponse` - Contact creation response interface
- `GHLContactSearchParams` - Contact search parameters interface
- `GhlTokenResponse` - OAuth token response interface

## Constants

### API Configuration
- `GHL_API_BASE` - Base API URL
- `GHL_AUTHORIZATION_URL` - OAuth authorization URL
- `GHL_TOKEN_URL` - Token exchange URL
- `GHL_API_VERSION` - API version
- `GHL_OAUTH_SCOPES` - Required OAuth scopes
- `DEFAULT_LOCATION_LIMIT` - Default limit for location queries
- `DEFAULT_CONTACT_LIMIT` - Default limit for contact queries

## Error Handling

The module includes comprehensive error handling with:
- Automatic retry with exponential backoff
- Specific error messages for different HTTP status codes
- Proper TypeScript error types
- Detailed logging for debugging

## Migration from Old API

If you were previously importing from the old `api.ts` file:

```typescript
// Old way
import { createGHLContact } from '@/lib/ghl/api';

// New way (same import, no changes needed)
import { createGHLContact } from '@/lib/ghl/api';

// Or use the cleaner index import
import { createGHLContact } from '@/lib/ghl';
```

All existing imports will continue to work without any changes due to the re-export structure.

## Benefits of the Refactoring

1. **Better Organization** - Related functions are grouped together
2. **Easier Maintenance** - Smaller files are easier to understand and modify
3. **Better Testing** - Individual modules can be tested in isolation
4. **Improved Reusability** - Utility functions can be reused across modules
5. **Type Safety** - Centralized type definitions
6. **Configuration Management** - All constants in one place
7. **Error Handling** - Consistent error handling across all functions
8. **Backward Compatibility** - All existing imports continue to work