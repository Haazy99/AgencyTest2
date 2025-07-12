"use client";

import { AppHeader } from "@/components/layout/app-header";
import { D7LeadSearchSection } from "@/components/sections/d7-lead-search-section";
import { GHLConnectionSection } from "@/components/sections/ghl-connection-section";
import { LeadExportSection } from "@/components/sections/lead-export-section";
import { SmartMapperModal } from "@/components/smart-mapper-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { D7Lead, GHLSubAccount, SmartMapping } from "@/types";
import { useEffect, useState, useCallback } from "react";
import Image from 'next/image';
import { generateLeads, type GenerateLeadsInput } from "@/ai/flows/generate-leads-flow";

export default function Home() {
  const { toast } = useToast();

  // GHL State
  const [ghlConnected, setGhlConnected] = useState(false);
  const [isGhlLoading, setIsGhlLoading] = useState(false);
  const [ghlSubAccounts, setGhlSubAccounts] = useState<GHLSubAccount[]>([]);
  const [selectedSubAccountId, setSelectedSubAccountId] = useState<string | null>(null);
  const [isLoadingSubAccounts, setIsLoadingSubAccounts] = useState(false);
  const [hasTriedFetchingSubAccounts, setHasTriedFetchingSubAccounts] = useState(false); // Prevent repeated failed attempts

  // D7 Search State
  const [d7SearchResults, setD7SearchResults] = useState<D7Lead[]>([]);
  const [isD7Searching, setIsD7Searching] = useState(false);

  // Smart Mapping Modal State
  const [isSmartMapModalOpen, setIsSmartMapModalOpen] = useState(false);
  const [currentLeadForMapping, setCurrentLeadForMapping] = useState<D7Lead | null>(null);

  // Check GHL connection status on page load
  const checkGhlConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/ghl/status');
      const data = await response.json();
      
      if (response.ok && data.isConnected) {
        setGhlConnected(true);
        setHasTriedFetchingSubAccounts(false); // Reset flag for verified connection
        toast({ 
          title: "Connected to GoHighLevel", 
          description: "Your GoHighLevel account is connected and ready to use.",
          variant: "default"
        });
      } else {
        setGhlConnected(false);
        setHasTriedFetchingSubAccounts(false); // Reset flag
      }
    } catch (error) {
      console.error('Error checking GHL connection status:', error);
      setGhlConnected(false);
      setHasTriedFetchingSubAccounts(false); // Reset flag on error
      // Don't show error toast on page load, just keep disconnected state
    }
  }, []);

  useEffect(() => {
    // Check for OAuth callback success message in URL
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message && message.includes('connected successfully')) {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkGhlConnectionStatus();
  }, []);

  // Simulate GHL Connection
  const handleGhlConnect = async () => {
    setIsGhlLoading(true);
    toast({ title: "Initiating GHL Connection...", description: "Opening GoHighLevel authorization window." });
    try {
      // Call the backend API route to get the authorization URL
      const response = await fetch('/api/auth/ghl/connect');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from /api/auth/ghl/connect:', response.status, errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received authorization URL:', data);

      if (!data.authorizationUrl) {
        throw new Error('No authorization URL received from server');
      }

      const authorizationUrl = data.authorizationUrl;

      // Open OAuth in a popup window instead of full redirect
      const popup = window.open(
        authorizationUrl,
        'ghl-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }

      // Listen for the popup to close or receive a message
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsGhlLoading(false);
          // Check connection status after popup closes
          checkGhlConnectionStatus();
        }
      }, 1000);

      // Listen for messages from the popup (for successful OAuth)
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GHL_OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageListener);
          setIsGhlLoading(false);
          setGhlConnected(true);
          setHasTriedFetchingSubAccounts(false); // Reset flag for new connection
          toast({ 
            title: "Connected to GoHighLevel", 
            description: "Your GoHighLevel account is connected and ready to use.",
            variant: "default"
          });
        } else if (event.data.type === 'GHL_OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageListener);
          setIsGhlLoading(false);
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: event.data.message || "Could not connect to GoHighLevel.",
          });
        }
      };

      window.addEventListener('message', messageListener);

      // Cleanup if component unmounts
      return () => {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        if (!popup.closed) popup.close();
      };

    } catch (error: any) {
      console.error('Error initiating GHL connection:', error);
      setIsGhlLoading(false);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message || "Could not initiate connection with GoHighLevel.",
      });
    }
  };

  // Handle GHL Disconnection
  const handleGhlDisconnect = async () => {
    try {
      const response = await fetch('/api/auth/ghl/disconnect', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setGhlConnected(false);
        setGhlSubAccounts([]);
        setSelectedSubAccountId(null);
        setHasTriedFetchingSubAccounts(false);
        
        toast({ 
          title: "Disconnected", 
          description: "Successfully disconnected from GoHighLevel.",
          variant: "default"
        });
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (error: any) {
      console.error('Error disconnecting from GHL:', error);
      toast({
        variant: "destructive",
        title: "Disconnect Failed",
        description: error.message || "Could not disconnect from GoHighLevel.",
      });
    }
  };
  
  const fetchGhlSubAccounts = useCallback(async () => {
    if (!ghlConnected) return;
    setIsLoadingSubAccounts(true);
    setHasTriedFetchingSubAccounts(true);
    
    try {
      const response = await fetch('/api/ghl/locations');
      const data = await response.json();
      
      if (!response.ok) {
        // If the error is about no access token, it means the session is stale
        if (data.error && data.error.includes('No GHL access token found')) {
          console.log('No access token found, setting ghlConnected to false');
          setGhlConnected(false);
          setHasTriedFetchingSubAccounts(false); // Reset for next connection attempt
          return; // Don't show error toast for this case
        }
        throw new Error(data.error || 'Failed to fetch sub-accounts');
      }
      
      setGhlSubAccounts(data.subAccounts || []);
      
      if (data.subAccounts && data.subAccounts.length > 0) {
        toast({ 
          title: "Sub-accounts loaded", 
          description: `Found ${data.subAccounts.length} GoHighLevel sub-account(s).`,
          variant: "default"
        });
      } else {
        toast({ 
          title: "No sub-accounts found", 
          description: "No GoHighLevel sub-accounts found for your agency.",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Error fetching GHL sub-accounts:', error);
      toast({
        variant: "destructive",
        title: "Failed to load sub-accounts",
        description: error.message || "Could not fetch GoHighLevel sub-accounts.",
      });
    } finally {
      setIsLoadingSubAccounts(false);
    }
  }, [ghlConnected]);

  // D7 Lead Fetching
  const handleD7Search = async (keyword: string, location: string, countryCode: string) => {
    setIsD7Searching(true);
    setD7SearchResults([]); // Clear previous results
    toast({ title: "Fetching Leads from D7...", description: `Searching for ${keyword} in ${location}, ${countryCode}.` });
    try {
      const input: GenerateLeadsInput = { keyword, location, countryCode, limit: 30 }; 
      const fetchedLeadsOutput = await generateLeads(input);
      
      // Add client-side log here
      console.log("Received leads from server action:", fetchedLeadsOutput);

      const leadsWithIds: D7Lead[] = fetchedLeadsOutput.map((lead) => ({
        ...lead,
        id: crypto.randomUUID(), // Generate unique ID client-side
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown'
      }));
      
      setD7SearchResults(leadsWithIds);
      if (leadsWithIds.length > 0) {
        toast({ title: "Leads Fetched!", description: `Found ${leadsWithIds.length} leads from D7 Lead Finder.`, variant: "default" });
      } else {
        toast({ title: "No Leads Found", description: `No leads found for "${keyword}" in ${location}, ${countryCode} from D7.`, variant: "default" });
      }
    } catch (error: any) {
      console.error("Error fetching D7 leads:", error);
      toast({
        variant: "destructive",
        title: "D7 Lead Fetch Failed",
        description: error.message || "Could not fetch leads from D7. Please try again.",
      });
    } finally {
      setIsD7Searching(false);
    }
  };

  // Smart Mapping and Export Logic
  const handleInitiateExport = (lead: D7Lead) => {
    if (!selectedSubAccountId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a GHL sub-account first." });
      return;
    }
    
    // TEMPORARILY SKIP SMART MAPPING MODAL FOR TESTING
    console.log('Skipping smart mapping modal for testing - using direct export');
    handleExportConfirm(lead, {}); // Empty mapping = direct field mapping
    
    // ORIGINAL CODE (commented out for testing):
    // setCurrentLeadForMapping(lead);
    // setIsSmartMapModalOpen(true);
  };

  const handleExportConfirm = async (leadData: D7Lead, mapping: SmartMapping) => {
    const subAccount = ghlSubAccounts.find(sa => sa.id === selectedSubAccountId);
    if (!subAccount || !selectedSubAccountId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a valid sub-account.",
      });
      return;
    }

    toast({ 
      title: "Exporting Lead...", 
      description: `Exporting ${leadData.companyName || leadData.email || leadData.firstName} to ${subAccount.name}.` 
    });
    
    try {
      const response = await fetch('/api/ghl/export-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead: leadData,
          locationId: selectedSubAccountId,
          mapping: mapping,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to export lead');
      }

      console.log("Lead exported successfully:", result);
      
      toast({ 
        title: "Lead Exported!", 
        description: `${leadData.companyName || leadData.email || leadData.firstName} successfully exported to ${subAccount.name}.`,
        variant: "default"
      });
      
      setIsSmartMapModalOpen(false);
      setCurrentLeadForMapping(null);
      
    } catch (error: any) {
      console.error("Error exporting lead:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "Could not export lead to GoHighLevel.",
      });
    }
  };
  
  useEffect(() => {
    if (ghlConnected && ghlSubAccounts.length === 0 && !isLoadingSubAccounts && !hasTriedFetchingSubAccounts) {
      fetchGhlSubAccounts();
    }
  }, [ghlConnected, ghlSubAccounts.length, isLoadingSubAccounts, hasTriedFetchingSubAccounts]);

  const selectedSubAccount = ghlSubAccounts.find(sa => sa.id === selectedSubAccountId);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <AppHeader />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-8 md:col-span-1">
          <GHLConnectionSection
            isConnected={ghlConnected}
            isLoading={isGhlLoading}
            onConnect={handleGhlConnect}
            onDisconnect={handleGhlDisconnect}
          />
          <D7LeadSearchSection
            onSearch={handleD7Search}
            isLoading={isD7Searching}
            ghlConnected={ghlConnected}
          />
        </div>
        <div className="space-y-8 md:col-span-2">
          <LeadExportSection
            leads={d7SearchResults}
            subAccounts={ghlSubAccounts}
            selectedSubAccountId={selectedSubAccountId}
            onSelectSubAccount={setSelectedSubAccountId}
            onInitiateExport={handleInitiateExport}
            isLoadingSubAccounts={isLoadingSubAccounts}
            isLoadingLeads={isD7Searching}
            ghlConnected={ghlConnected}
          />
        </div>
      </div>

      <SmartMapperModal
        isOpen={isSmartMapModalOpen}
        onOpenChange={setIsSmartMapModalOpen}
        d7Lead={currentLeadForMapping}
        selectedSubAccountName={selectedSubAccount?.name || null}
        onExportConfirm={handleExportConfirm}
      />
    </div>
  );
}
