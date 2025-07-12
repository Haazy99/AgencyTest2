
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

interface D7LeadSearchSectionProps {
  onSearch: (keyword: string, location: string, countryCode: string) => void;
  isLoading: boolean;
  ghlConnected: boolean;
}

export function D7LeadSearchSection({
  onSearch,
  isLoading,
  ghlConnected,
}: D7LeadSearchSectionProps) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState(""); // City name
  const [countryCode, setCountryCode] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !location.trim() || !countryCode.trim()) {
      alert("Please enter keyword, city, and country code.");
      return;
    }
    if (countryCode.trim().length !== 2) {
      alert("Country code must be exactly 2 characters.");
      return;
    }
    onSearch(keyword, location, countryCode.toUpperCase());
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Search className="mr-2 h-6 w-6 text-primary" />
          D7 Lead Finder Search
        </CardTitle>
        <CardDescription>
          Find potential leads using D7 Lead Finder. Requires GHL connection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keyword">Search Keyword (e.g., Plumbers)</Label>
            <Input
              id="keyword"
              placeholder="Enter keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={!ghlConnected || isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">City Name (e.g., New York, London)</Label>
            <Input
              id="location"
              placeholder="Enter city name"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!ghlConnected || isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="countryCode">Country Code (2 Chars, e.g., US, GB)</Label>
            <Input
              id="countryCode"
              placeholder="Enter 2-char country code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={!ghlConnected || isLoading}
              maxLength={2}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90" 
            disabled={!ghlConnected || isLoading || !keyword.trim() || !location.trim() || !countryCode.trim() || countryCode.trim().length !== 2}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search Leads
          </Button>
          {!ghlConnected && (
            <p className="text-sm text-destructive text-center">
              Please connect to GoHighLevel to enable lead search.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
