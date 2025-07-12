import type { D7Lead } from '@/types';

const SAMPLE_CATEGORIES = [
  'Plumbers',
  'Electricians',
  'HVAC Contractors',
  'Roofers',
  'Landscapers',
  'Home Builders',
  'Interior Designers',
  'Painters',
  'Carpet Cleaners',
  'Window Installers'
];

const SAMPLE_COMPANIES = [
  { name: 'Elite Home Services', facebook: 'EliteHomeServices' },
  { name: 'Pro Solutions Group', facebook: 'ProSolutionsGroup' },
  { name: 'Master Craft', facebook: 'MasterCraftPros' },
  { name: 'Quality First', facebook: 'QualityFirstServices' },
  { name: 'Premier Solutions', facebook: 'PremierSolutionsCo' },
  { name: 'Expert Team', facebook: 'ExpertTeamServices' },
  { name: 'Five Star Pros', facebook: 'FiveStarPros' },
  { name: 'Top Notch Services', facebook: 'TopNotchServices' },
  { name: 'Best in Class', facebook: 'BestInClassPros' },
  { name: 'Professional Edge', facebook: 'ProfessionalEdge' },
  { name: 'Superior Services', facebook: 'SuperiorServicesPro' },
  { name: 'Prime Solutions', facebook: 'PrimeSolutionsGroup' },
  { name: 'Advanced Systems', facebook: 'AdvancedSystemsPro' },
  { name: 'Ultimate Services', facebook: 'UltimateServicesCo' },
  { name: 'Perfect Choice', facebook: 'PerfectChoicePros' },
  { name: 'Reliable Team', facebook: 'ReliableTeamServices' },
  { name: 'Expert Solutions', facebook: 'ExpertSolutionsPro' },
  { name: 'Master Services', facebook: 'MasterServicesCo' },
  { name: 'Premium Quality', facebook: 'PremiumQualityPros' },
  { name: 'Elite Professionals', facebook: 'EliteProfessionals' }
];

const SAMPLE_STATES = [
  'CA', 'TX', 'FL', 'NY', 'IL',
  'PA', 'OH', 'GA', 'NC', 'MI'
];

const SAMPLE_CITIES = [
  'Los Angeles', 'Houston', 'Miami',
  'New York', 'Chicago', 'Philadelphia',
  'Columbus', 'Atlanta', 'Charlotte',
  'Detroit', 'Phoenix', 'San Diego',
  'Dallas', 'San Jose', 'Austin',
  'Jacksonville', 'San Francisco',
  'Indianapolis', 'Seattle', 'Denver'
];

export function generateSampleLeads(count: number = 20): D7Lead[] {
  return Array.from({ length: count }, (_, index) => {
    const company = SAMPLE_COMPANIES[index % SAMPLE_COMPANIES.length];
    const category = SAMPLE_CATEGORIES[Math.floor(Math.random() * SAMPLE_CATEGORIES.length)];
    const state = SAMPLE_STATES[Math.floor(Math.random() * SAMPLE_STATES.length)];
    const city = SAMPLE_CITIES[Math.floor(Math.random() * SAMPLE_CITIES.length)];
    const firstName = `John`;
    const lastName = `Doe ${index + 1}`;
    
    // Determine if this lead should have a Facebook page (80% chance)
    const hasFacebook = Math.random() < 0.8;
    
    return {
      id: `lead_${index + 1}`,
      name: `${firstName} ${lastName}`,
      companyName: company.name,
      category,
      firstName,
      lastName,
      email: `contact@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      website: `www.${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
      address: `${Math.floor(Math.random() * 9000) + 1000} Business Ave`,
      city,
      state,
      zipCode: String(Math.floor(Math.random() * 90000) + 10000),
      country: 'US',
      // Facebook page (if applicable)
      facebookPage: hasFacebook ? `https://facebook.com/${company.facebook}` : undefined,
      // Initialize ad-related fields as undefined
      hasActiveAds: undefined,
      adLibraryUrl: undefined,
      lastAdScanDate: undefined
    };
  });
} 