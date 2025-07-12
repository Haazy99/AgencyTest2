"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function TestExportPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  // The location ID from the failing export
  const testLocationId = 'vI11WS3k6WYWGJuMrKrY'; // Agency Profits

  const testExport = async () => {
    const locationId = selectedLocationId || testLocationId;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ghl/test-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId })
      });
      
      const data = await response.json();
      setResults(data);
      
      if (data.success) {
        toast({ 
          title: "Test export successful", 
          description: `Contact created with ID: ${data.contactId}` 
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Test export failed", description: error.message });
      setResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Export Functionality</CardTitle>
          <CardDescription>
            Test the contact creation that was failing in the export-lead endpoint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Location ID (leave empty to use failing location)
            </label>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location or leave empty for test location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Use test location (Agency Profits)</SelectItem>
                <SelectItem value="vI11WS3k6WYWGJuMrKrY">Agency Profits (vI11WS3k6WYWGJuMrKrY)</SelectItem>
                <SelectItem value="soFqxvyZqGU5WHtZBQjB">Test Account 1</SelectItem>
                <SelectItem value="zTkvn5AqtMuhuhDnwMx1">Test Account 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={testExport} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Testing Export...' : 'Test Export'}
          </Button>

          {results && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Results:</h3>
              <Textarea
                value={JSON.stringify(results, null, 2)}
                readOnly
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 