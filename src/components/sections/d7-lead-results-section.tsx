"use client";

import type { D7Lead } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Search,
  Loader2,
  ExternalLink,
  Facebook,
  ScanSearch,
  CheckCircle2,
  XCircle,
  Building2
} from "lucide-react";

interface D7LeadResultsSectionProps {
  leads: D7Lead[];
  isLoading: boolean;
}

export function D7LeadResultsSection({
  leads,
  isLoading,
}: D7LeadResultsSectionProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedLeads, setScannedLeads] = useState<D7Lead[]>([]);

  // Count leads with Facebook pages
  const leadsWithFacebook = leads.filter(lead => lead.facebookPage).length;

  const handleScanAds = async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    try {
      const response = await fetch('/api/scan-facebook-ads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ leads })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Scan failed with status:', response.status, 'Response:', data);
        throw new Error(data.error || 'Failed to scan Facebook ads');
      }

      setScannedLeads(data.results);
      toast({
        title: "Ad Scan Complete",
        description: `Scanned ${leadsWithFacebook} Facebook pages for active ads.`
      });
    } catch (error: any) {
      console.error('Error scanning ads:', error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: error.message || "Could not scan Facebook ads. Please check your API configuration."
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Combine leads with scanned results
  const displayLeads = leads.map(lead => {
    const scannedLead = scannedLeads.find(sl => sl.id === lead.id);
    return scannedLead || lead;
  });

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Search className="mr-2 h-6 w-6 text-primary" />
            Search Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-xl">
              <Search className="mr-2 h-6 w-6 text-primary" />
              Search Results
            </CardTitle>
            <CardDescription>
              Found {displayLeads.length} leads
            </CardDescription>
          </div>
          {leadsWithFacebook > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScanAds}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="mr-2 h-4 w-4" />
              )}
              Scan Facebook Ads ({leadsWithFacebook})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No leads found. Try searching with different criteria.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {displayLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {lead.companyName || `${lead.firstName} ${lead.lastName}` || 'Unnamed Lead'}
                        </h3>
                        <p className="text-sm text-muted-foreground">{lead.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center"
                          >
                            Website <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                        {lead.facebookPage && (
                          <div className="flex items-center gap-1">
                            <a
                              href={lead.facebookPage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center"
                              title="Visit Facebook Page"
                            >
                              <Facebook className="h-4 w-4" />
                            </a>
                            {lead.hasActiveAds !== undefined && (
                              <a
                                href={lead.adLibraryUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm flex items-center ${lead.hasActiveAds ? 'text-green-600' : 'text-red-600'}`}
                                title={`${lead.hasActiveAds ? 'Has active ads' : 'No active ads'} - Click to view Ad Library`}
                              >
                                {lead.hasActiveAds ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Contact:</p>
                        {lead.email && <p>{lead.email}</p>}
                        {lead.phone && <p>{lead.phone}</p>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location:</p>
                        <p>{[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
} 