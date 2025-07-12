"use client";

import type { D7Lead, GHLSubAccount } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Briefcase, 
  Users, 
  DownloadCloud, 
  Info, 
  Loader2, 
  ExternalLink,
  Facebook,
  ScanSearch,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface LeadExportSectionProps {
  leads: D7Lead[];
  subAccounts: GHLSubAccount[];
  selectedSubAccountId: string | null;
  onSelectSubAccount: (id: string) => void;
  onInitiateExport: (lead: D7Lead) => void;
  isLoadingSubAccounts: boolean;
  isLoadingLeads: boolean;
  ghlConnected: boolean;
}

export function LeadExportSection({
  leads,
  subAccounts,
  selectedSubAccountId,
  onSelectSubAccount,
  onInitiateExport,
  isLoadingSubAccounts,
  isLoadingLeads,
  ghlConnected,
}: LeadExportSectionProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedLeads, setScannedLeads] = useState<D7Lead[]>([]);
  
  const selectedSubAccount = subAccounts.find(sa => sa.id === selectedSubAccountId);

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
          // Prevent caching to ensure fresh results
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ leads })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scan Facebook ads');
      }

      const data = await response.json();
      
      // Immediately update scanned leads
      setScannedLeads(data.results);
      
      // Show success toast after state update
      toast({
        title: "Ad Scan Complete",
        description: `Scanned ${leadsWithFacebook} Facebook pages for active ads.`,
        duration: 3000 // Shorter duration for better UX
      });
    } catch (error: any) {
      console.error('Error scanning ads:', error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: error.message,
        duration: 5000 // Longer duration for errors
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Optimize the leads combination
  const displayLeads = leads.map(lead => {
    if (!lead.facebookPage) return lead;
    return scannedLeads.find(sl => sl.id === lead.id) || lead;
  });

  return (
    <Card className="shadow-lg md:col-span-2">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-xl">
              <Users className="mr-2 h-6 w-6 text-primary" />
              Lead Export
            </CardTitle>
            <CardDescription>
              Select a GoHighLevel sub-account and export your found leads.
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
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Sub-Account</label>
          <Select
            value={selectedSubAccountId || ""}
            onValueChange={onSelectSubAccount}
            disabled={isLoadingSubAccounts || !ghlConnected}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a sub-account..." />
            </SelectTrigger>
            <SelectContent>
              {subAccounts.map((sa) => (
                <SelectItem key={sa.id} value={sa.id}>
                  {sa.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoadingLeads && (
          <div className="flex items-center justify-center h-72">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoadingLeads && displayLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-72 text-center space-y-2">
            <Info className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No leads found. Try searching above.</p>
          </div>
        )}

        {!isLoadingLeads && displayLeads.length > 0 && (
          <ScrollArea className="h-72 w-full rounded-md border p-2">
            <ul className="space-y-3">
              {displayLeads.map((lead) => (
                <li key={lead.id} className="p-3 bg-card border rounded-md shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-foreground">{lead.companyName || `${lead.firstName} ${lead.lastName}` || 'Unnamed Lead'}</p>
                      <p className="text-sm text-muted-foreground">{lead.email}</p>
                      <p className="text-sm text-muted-foreground">{lead.phone}</p>
                      <div className="flex gap-2 mt-1">
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center"
                          >
                            {lead.website} <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                        {lead.facebookPage && (
                          <div className="flex items-center gap-2">
                            <a
                              href={lead.facebookPage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center"
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onInitiateExport(lead)}
                      disabled={!selectedSubAccountId}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
