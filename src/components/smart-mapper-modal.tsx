"use client";

import { smartMap, type SmartMapInput, type SmartMapOutput } from "@/ai/flows/smart-mapping";
import type { D7Lead } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, UploadCloud, Loader2, AlertTriangle, Edit3, RefreshCw, Save } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface SmartMapperModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  d7Lead: D7Lead | null;
  selectedSubAccountName: string | null;
  onExportConfirm: (leadData: D7Lead, mapping: SmartMapOutput) => Promise<void>;
}

// Sample GHL fields - in a real app, these might be fetched or configurable
const GHL_TARGET_FIELDS: string[] = [
  "firstName", "lastName", "email", "phone", "companyName", 
  "address1", "city", "state", "postalCode", "country", "website", 
  "tags", "source", "d7LeadCategory", "d7YearsInBusiness", "d7ServicesOffered"
];

const NOT_MAPPED_VALUE = "__NOT_MAPPED__";
const LOCAL_STORAGE_MAPPING_PREFIX = "leadflowai_mapping_";

export function SmartMapperModal({
  isOpen,
  onOpenChange,
  d7Lead,
  selectedSubAccountName,
  onExportConfirm,
}: SmartMapperModalProps) {
  const [editableMapping, setEditableMapping] = useState<SmartMapOutput | null>(null);
  const [isLoadingMapping, setIsLoadingMapping] = useState(false); // For initial load or explicit AI fetch
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const { toast } = useToast();

  const getLocalStorageKey = useCallback((category?: string) => {
    return category ? `${LOCAL_STORAGE_MAPPING_PREFIX}${category.replace(/\s+/g, '_').toLowerCase()}` : null;
  }, []);

  const fetchAndSetAIMapping = useCallback(async (currentLead: D7Lead) => {
    setIsLoadingMapping(true);
    setError(null);
    setLoadedFromStorage(false);
    try {
      const d7LeadForAI: Record<string, any> = { ...currentLead };
      delete d7LeadForAI.id;

      const input: SmartMapInput = {
        d7Lead: d7LeadForAI,
        ghlFields: GHL_TARGET_FIELDS,
      };
      const aiSuggestedMapping = await smartMap(input);
      
      const initialEditableMapping: SmartMapOutput = {};
      GHL_TARGET_FIELDS.forEach(ghlField => {
        initialEditableMapping[ghlField] = aiSuggestedMapping[ghlField] || ""; 
      });
      setEditableMapping(initialEditableMapping);
      toast({
        title: "AI Mapping Applied",
        description: "AI has suggested field mappings.",
      });
    } catch (err) {
      console.error("Error fetching smart mapping:", err);
      setError("Failed to generate AI smart mapping. Please try again or map manually.");
      const emptyMapping: SmartMapOutput = {};
      GHL_TARGET_FIELDS.forEach(ghlField => {
        emptyMapping[ghlField] = "";
      });
      setEditableMapping(emptyMapping);
      toast({
        variant: "destructive",
        title: "AI Mapping Error",
        description: "Could not auto-generate field mapping. You can map fields manually.",
      });
    } finally {
      setIsLoadingMapping(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && d7Lead) {
      let foundSavedMapping = false;
      const category = d7Lead.category;
      const storageKey = category ? getLocalStorageKey(category) : null;

      if (storageKey && typeof window !== 'undefined') {
        const savedMappingJson = localStorage.getItem(storageKey);
        if (savedMappingJson) {
          try {
            const savedMapping = JSON.parse(savedMappingJson) as SmartMapOutput;
            // Validate saved mapping structure slightly
            if (typeof savedMapping === 'object' && savedMapping !== null) {
              const validatedSavedMapping: SmartMapOutput = {};
              GHL_TARGET_FIELDS.forEach(ghlField => {
                validatedSavedMapping[ghlField] = savedMapping[ghlField] || "";
              });
              setEditableMapping(validatedSavedMapping);
              setLoadedFromStorage(true);
              foundSavedMapping = true;
              toast({
                title: "Saved Mapping Loaded",
                description: `Mapping for category "${category}" loaded from your preferences.`,
              });
            }
          } catch (e) {
            console.error("Failed to parse saved mapping from localStorage", e);
            localStorage.removeItem(storageKey); // Clear corrupted data
          }
        }
      }

      if (!foundSavedMapping) {
        fetchAndSetAIMapping(d7Lead);
      }
    } else {
      setEditableMapping(null);
      setIsLoadingMapping(false);
      setError(null);
      setLoadedFromStorage(false);
    }
  }, [isOpen, d7Lead]);

  const handleMappingChange = (ghlField: string, d7FieldKey: string) => {
    setEditableMapping((prevMapping) => {
      if (!prevMapping) return null;
      const newMapping = { ...prevMapping };
      newMapping[ghlField] = d7FieldKey === NOT_MAPPED_VALUE ? "" : d7FieldKey;
      return newMapping;
    });
    // If user edits a mapping loaded from storage, it's no longer purely "loaded from storage"
    // or rather, their intent is to modify it.
    if (loadedFromStorage) setLoadedFromStorage(false); 
  };

  const handleExport = async () => {
    if (!d7Lead || !editableMapping) return;
    setIsExporting(true);
    try {
      const finalMapping: SmartMapOutput = {};
      for (const key in editableMapping) {
        if (editableMapping[key] && editableMapping[key] !== NOT_MAPPED_VALUE) {
          finalMapping[key] = editableMapping[key];
        }
      }
      await onExportConfirm(d7Lead, finalMapping);

      // Save the successful mapping to localStorage if category exists
      const category = d7Lead.category;
      const storageKey = category ? getLocalStorageKey(category) : null;
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(finalMapping));
        toast({
            title: "Lead Exported & Mapping Saved",
            description: `Mapping for category "${category}" has been saved.`,
            variant: "default"
        });
      } else {
         toast({
            title: "Lead Exported",
            description: "The lead has been exported successfully.",
            variant: "default"
        });
      }
    } catch (e) {
        // onExportConfirm might throw or have its own toasts.
        // If not, we can add a generic export failed toast here.
        console.error("Export failed:", e);
    }
    finally {
      setIsExporting(false);
    }
  };

  const handleGetAISuggestion = () => {
    if (d7Lead) {
      fetchAndSetAIMapping(d7Lead);
    }
  };
  
  if (!d7Lead) return null;

  const d7LeadDisplay = Object.entries(d7Lead).filter(([key]) => key !== 'id');
  const d7LeadFieldKeys = Object.keys(d7Lead).filter(key => key !== 'id');


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Brain className="mr-2 h-6 w-6 text-primary" />
            Smart Field Mapper & Export
          </DialogTitle>
          <DialogDescription>
            Review and adjust field mapping for "{d7Lead.companyName || `${d7Lead.firstName} ${d7Lead.lastName}`}" 
            before exporting to "{selectedSubAccountName || 'selected sub-account'}".
            {d7Lead.category && loadedFromStorage && (
              <span className="block text-sm text-green-600 mt-1">
                <Save className="inline h-4 w-4 mr-1" />
                Pre-filled with your saved mapping for '{d7Lead.category}'.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && !isLoadingMapping && (
          <div className="p-4 my-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 overflow-hidden flex-grow">
          <div className="space-y-3 overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-muted-foreground"><path d="M7.2 2.8a4 4 0 0 1 5.6 0L16 6l-2.9 2.9a2 2 0 0 1-2.8 0L7.2 2.8Z"/><path d="M10 16.5 8.5 18a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8L8 8.5"/><path d="m14 14 4.5 4.5"/><path d="M14.5 8.5 17 11l1.5-1.5a2 2 0 0 0 0-2.8l-2.2-2.2a2 2 0 0 0-2.8 0L12 6m0 0 2.5 2.5M10 14l-2.5-2.5"/></svg>
              D7 Lead Data
            </h3>
            <ScrollArea className="h-96 border rounded-md p-4 bg-card shadow-sm">
              <dl className="space-y-1.5 text-sm">
                {d7LeadDisplay.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-1 py-1 border-b border-border last:border-b-0">
                    <dt className="font-medium capitalize text-muted-foreground col-span-1 break-words">{key.replace(/([A-Z])/g, ' $1')}:</dt>
                    <dd className="truncate text-foreground col-span-2 break-words">{String(value === null || value === undefined ? "N/A" : value)}</dd>
                  </div>
                ))}
              </dl>
            </ScrollArea>
          </div>

          <div className="space-y-3 overflow-hidden flex flex-col">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Edit3 className="mr-2 h-5 w-5 text-muted-foreground" />
                GoHighLevel Field Mapping
                </h3>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGetAISuggestion} 
                    disabled={isLoadingMapping}
                    title="Get fresh AI suggestions for mapping"
                >
                    {isLoadingMapping && loadedFromStorage === false ? ( // Only show spinner if it's the main AI loading
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Get AI Suggestion
                </Button>
            </div>
            {isLoadingMapping && !editableMapping && ( // Initial loading state
              <div className="flex items-center justify-center h-96 border rounded-md p-4 bg-card shadow-sm">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">AI is generating smart mapping...</p>
              </div>
            )}
            {!isLoadingMapping && editableMapping && (
              <ScrollArea className="h-96 border rounded-md bg-card shadow-sm">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-[40%]">GHL Field</TableHead>
                      <TableHead className="w-[60%]">Maps to D7 Field (Source Value)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {GHL_TARGET_FIELDS.map((ghlField) => (
                      <TableRow key={ghlField}>
                        <TableCell className="font-medium text-foreground break-words py-2.5">{ghlField}</TableCell>
                        <TableCell className="py-1.5">
                          <Select
                            value={editableMapping[ghlField] || NOT_MAPPED_VALUE}
                            onValueChange={(value) => handleMappingChange(ghlField, value)}
                            disabled={isLoadingMapping}
                          >
                            <SelectTrigger className="w-full text-sm h-9">
                              <SelectValue placeholder="Select D7 field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NOT_MAPPED_VALUE}>
                                -- Not Mapped --
                              </SelectItem>
                              {d7LeadFieldKeys.map((d7Key) => (
                                <SelectItem key={d7Key} value={d7Key} className="text-sm">
                                  {d7Key} 
                                  <span className="ml-2 text-xs text-muted-foreground truncate block">
                                    (Value: {String(d7Lead[d7Key] !== undefined && d7Lead[d7Key] !== null && String(d7Lead[d7Key]).trim() !== '' ? String(d7Lead[d7Key]) : "Empty")})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
             {!isLoadingMapping && !editableMapping && !error && ( // Fallback empty state
                <div className="flex items-center justify-center h-96 border rounded-md p-4 bg-card shadow-sm">
                    <p className="text-muted-foreground">Mapping will appear here.</p>
                </div>
             )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting || isLoadingMapping}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isLoadingMapping || !editableMapping || isExporting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            Confirm & Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

