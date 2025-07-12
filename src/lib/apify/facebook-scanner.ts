import { ApifyClient } from 'apify-client';
import type { D7Lead, FacebookAdScanResult } from '@/types';

interface FacebookPageResult {
  pageUrl: string;
  pageId?: string;
  hasActiveAds?: boolean;
  adLibraryUrl?: string;
  url?: string;
  error?: string;
  errorDescription?: string;
  name?: string;
  username?: string;
}

export class FacebookScanner {
  private client: ApifyClient;
  private readonly ACTOR_ID = 'apify/facebook-pages-scraper';

  constructor() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error('APIFY_API_TOKEN environment variable is not set');
    }
    this.client = new ApifyClient({ token });
  }

  private extractPageUsername(pageUrl: string): string {
    try {
      // Clean the URL
      let cleanUrl = pageUrl
        .toLowerCase()
        .replace(/^https?:\/\/(www\.)?facebook\.com\/?/, '')
        .replace(/\/$/, '');

      // Handle different URL patterns
      if (cleanUrl.startsWith('pg/')) {
        cleanUrl = cleanUrl.replace('pg/', '');
      }
      if (cleanUrl.startsWith('pages/')) {
        cleanUrl = cleanUrl.replace('pages/', '');
      }

      // Get the last segment of the URL (username or page name)
      const segments = cleanUrl.split('/').filter(Boolean);
      const username = segments[segments.length - 1] || cleanUrl;

      // Debug: Log the extracted username
      console.log('Extracted username:', { pageUrl, username });

      return username;
    } catch (error) {
      console.error('Error extracting page username:', error);
      return '';
    }
  }

  private constructAdLibraryUrl(result: FacebookPageResult): string {
    // Always try to get a name/username, even from the URL if needed
    const searchTerm = result.name || result.username || this.extractPageUsername(result.pageUrl || result.url || '');
    const encodedSearchTerm = encodeURIComponent(searchTerm);
    
    let url: string;
    
    // If we have a pageId, use that for more precise results
    if (result.pageId) {
      url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${result.pageId}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped&search_type=page&media_type=all`;
    } else {
      // Otherwise, use the search term
      url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodedSearchTerm}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped&search_type=page&media_type=all`;
    }

    // Debug: Log the constructed URL
    console.log('Constructed Ad Library URL:', {
      pageUrl: result.pageUrl || result.url,
      name: result.name,
      username: result.username,
      extractedUsername: searchTerm,
      pageId: result.pageId,
      finalUrl: url
    });

    return url;
  }

  /**
   * Scan a list of Facebook pages for active ads
   */
  async scanPages(leads: D7Lead[]) {
    try {
      // Filter leads with Facebook pages and extract usernames
      const pageUrls = leads
        .filter(lead => lead.facebookPage)
        .map(lead => lead.facebookPage!);

      if (pageUrls.length === 0) {
        return leads;
      }

      // Process in smaller batches for better performance
      const BATCH_SIZE = 10;
      const batches = [];
      for (let i = 0; i < pageUrls.length; i += BATCH_SIZE) {
        batches.push(pageUrls.slice(i, i + BATCH_SIZE));
      }

      const allResults = new Map<string, FacebookPageResult>();

      // Process each batch
      for (const batchUrls of batches) {
        // Start the actor run with optimized settings
        const run = await this.client.actor(this.ACTOR_ID).call({
          startUrls: batchUrls.map(url => ({ url })),
          searchLimit: 1,
          searchType: 'pages',
          maxRequestRetries: 2,
          maxConcurrency: 10,
          proxyConfiguration: { useApifyProxy: true },
          // Only get essential data
          scrapeAbout: false,
          scrapeAds: true,
          scrapeReviews: false,
          scrapePosts: false,
          scrapeServices: false,
          // Additional performance settings
          useAdvancedScraping: false,
          handlePageTimeoutSecs: 30
        });

        // Wait for the batch to finish
        const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

        // Debug: Log raw items from Apify
        console.log('Raw Apify items:', items);

        // Process batch results
        (items as any[]).forEach((item) => {
          if (!item) return;

          if (item.error) {
            const url = item.url?.toLowerCase();
            if (url) {
              const errorResult = {
                pageUrl: item.url,
                error: item.error,
                errorDescription: item.errorDescription
              };
              // Even for error cases, construct an Ad Library URL
              const adLibraryUrl = this.constructAdLibraryUrl({
                ...errorResult,
                url: item.url
              });
              allResults.set(url, {
                ...errorResult,
                adLibraryUrl
              });
            }
            return;
          }

          if (item.pageUrl) {
            const result = {
              ...item,
              name: item.name || undefined,
              username: item.username || undefined,
              // Ensure we always have an Ad Library URL
              adLibraryUrl: item.adLibraryUrl || this.constructAdLibraryUrl(item)
            };
            
            // Debug: Log the result before storing
            console.log('Processing Apify result:', {
              pageUrl: result.pageUrl,
              name: result.name,
              username: result.username,
              hasActiveAds: result.hasActiveAds,
              adLibraryUrl: result.adLibraryUrl
            });

            allResults.set(item.pageUrl.toLowerCase(), result);
          }
        });
      }

      // Update leads with ad information
      return leads.map(lead => {
        if (!lead.facebookPage) return lead;

        const result = allResults.get(lead.facebookPage.toLowerCase());
        if (!result) {
          // If no result found, still create an Ad Library URL
          const adLibraryUrl = this.constructAdLibraryUrl({
            pageUrl: lead.facebookPage
          });
          return {
            ...lead,
            hasActiveAds: false,
            facebookPageStatus: 'inaccessible',
            adLibraryUrl,
            lastAdScanDate: new Date().toISOString()
          };
        }

        // If the page had an error
        if (result.error) {
          return {
            ...lead,
            hasActiveAds: false,
            facebookPageStatus: 'inaccessible',
            facebookPageError: result.errorDescription || result.error,
            adLibraryUrl: result.adLibraryUrl,
            lastAdScanDate: new Date().toISOString()
          };
        }

        // If the page was successfully scanned
        const updatedLead = {
          ...lead,
          hasActiveAds: result.hasActiveAds || false,
          facebookPageStatus: 'active',
          adLibraryUrl: result.adLibraryUrl,
          lastAdScanDate: new Date().toISOString()
        };

        // Debug: Log the final lead update
        console.log('Updated lead:', {
          id: lead.id,
          facebookPage: lead.facebookPage,
          hasActiveAds: updatedLead.hasActiveAds,
          adLibraryUrl: updatedLead.adLibraryUrl
        });

        return updatedLead;
      });
    } catch (error) {
      console.error('Error scanning Facebook pages:', error);
      throw error;
    }
  }
} 