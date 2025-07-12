
'use server';
/**
 * @fileOverview Flow for fetching business leads from D7 Lead Finder API.
 *
 * - generateLeads - A function that handles fetching leads from D7.
 * - GenerateLeadsInput - The input type for the generateLeads function.
 * - GenerateLeadsOutput - The return type for the generateLeads function (an array of D7 leads without client-side IDs).
 * - GeneratedD7Lead - The type for a single lead structure (without client-side ID).
 */

import {ai} from '@/ai/genkit'; // ai.defineFlow is still useful for structure and potential future AI enhancements
import {z} from 'genkit';
import { fetchLeadsFromD7 } from '@/services/d7leadfinder';
import type { D7Lead } from '@/types';

// Schema for a single lead (ID will be added client-side)
const GeneratedD7LeadSchema = z.object({
  firstName: z.string().nullable().optional().describe("The first name of the contact person."),
  lastName: z.string().nullable().optional().describe("The last name of the contact person."),
  email: z.string().email().nullable().optional().describe("The email address of the lead."),
  phone: z.string().nullable().optional().describe("The phone number of the lead."),
  companyName: z.string().nullable().optional().describe("The name of the company."),
  website: z.string().url().nullable().optional().describe("The company's website URL."),
  address: z.string().nullable().optional().describe("The street address."),
  city: z.string().nullable().optional().describe("The city."),
  state: z.string().nullable().optional().describe("The state or province."),
  zipCode: z.string().nullable().optional().describe("The zip or postal code."),
  country: z.string().nullable().optional().describe("The country name."), // Full country name, not code
  category: z.string().nullable().optional().describe("The business category, should be related to the input keyword."),
  queryKeyword: z.string().optional().describe("The original keyword used for the search."),
  queryLocation: z.string().optional().describe("The original location context (e.g., City, CC).")
}).catchall(z.union([z.string(), z.boolean(), z.number(), z.null()]).optional()).describe("A single business lead fetched from D7 Lead Finder. Allows for additional dynamic properties.");
export type GeneratedD7Lead = z.infer<typeof GeneratedD7LeadSchema>;


const GenerateLeadsInputSchema = z.object({
  keyword: z.string().describe('The primary keyword for the lead search (e.g., "Plumbers", "Restaurants").'),
  location: z.string().describe('The city name for the lead search (e.g., "New York", "London").'),
  countryCode: z.string().length(2).describe('The 2-character ISO country code (e.g., "US", "GB").'),
  limit: z.number().optional().default(10).describe('The maximum number of leads to fetch.'),
});
export type GenerateLeadsInput = z.infer<typeof GenerateLeadsInputSchema>;

const GenerateLeadsOutputSchema = z.array(GeneratedD7LeadSchema);
export type GenerateLeadsOutput = z.infer<typeof GenerateLeadsOutputSchema>;


export async function generateLeads(input: GenerateLeadsInput): Promise<GenerateLeadsOutput> {
  return fetchD7LeadsFlow(input); // Renamed for clarity
}

const fetchD7LeadsFlow = ai.defineFlow(
  {
    name: 'fetchD7LeadsFlow',
    inputSchema: GenerateLeadsInputSchema,
    outputSchema: GenerateLeadsOutputSchema,
  },
  async (input): Promise<GenerateLeadsOutput> => {
    try {
      // Call the service function to fetch leads from D7 API
      const fetchedLeads = await fetchLeadsFromD7(input.keyword, input.location, input.countryCode, input.limit);
      
      // Validate the transformed leads against our Zod schema
      // This ensures consistency even if the D7 API response changes slightly
      // or if our transformation logic has minor issues.
      const validatedLeads = GenerateLeadsOutputSchema.parse(fetchedLeads);
      return validatedLeads;

    } catch (error: any) {
      console.error('Error in fetchD7LeadsFlow:', error);
      // Re-throw a more specific error or the original one
      throw new Error(`Failed to fetch and process leads from D7: ${error.message}`);
    }
  }
);
