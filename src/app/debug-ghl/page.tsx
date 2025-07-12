"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function DebugGHLPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ghl/test-contact');
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations);
        toast({ title: "Locations loaded", description: `Found ${data.locations.length} locations` });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestContact = async () => {
    if (!selectedLocationId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a location first" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ghl/test-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: selectedLocationId, action: 'create' })
      });
      
      const data = await response.json();
      setResults(data);
      
      if (data.success) {
        toast({ 
          title: "Test contact created", 
          description: `Contact ID: ${data.contactId}` 
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const searchContacts = async () => {
    if (!selectedLocationId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a location first" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ghl/test-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: selectedLocationId, action: 'search' })
      });
      
      const data = await response.json();
      setResults(data);
      
      if (data.success) {
        toast({ 
          title: "Search completed", 
          description: `Found ${data.contactCount} contacts` 
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const checkDebugInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ghl/debug');
      const data = await response.json();
      setResults(data);
      
      toast({ title: "Debug info loaded" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GoHighLevel Debug Tools</CardTitle>
          <CardDescription>
            Test contact creation and search functionality to debug why contacts aren't appearing in sub-accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadLocations} disabled={isLoading}>
              Load Locations
            </Button>
            <Button onClick={checkDebugInfo} disabled={isLoading}>
              Check Debug Info
            </Button>
          </div>

          {locations.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Location:</label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a sub-account" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({location.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={createTestContact} disabled={isLoading || !selectedLocationId}>
                  Create Test Contact
                </Button>
                <Button onClick={searchContacts} disabled={isLoading || !selectedLocationId}>
                  Search Contacts
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(results, null, 2)}
              readOnly
              className="min-h-[400px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 