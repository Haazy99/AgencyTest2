"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, LogOut, CheckCircle, XCircle } from "lucide-react";

interface GHLConnectionSectionProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading: boolean;
  agencyName?: string;
}

export function GHLConnectionSection({
  isConnected,
  onConnect,
  onDisconnect,
  isLoading,
  agencyName = "Your Agency",
}: GHLConnectionSectionProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <LogIn className="mr-2 h-6 w-6 text-primary" />
          GoHighLevel Connection
        </CardTitle>
        <CardDescription>
          Connect your GoHighLevel agency account to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center p-3 rounded-md bg-green-50 border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm font-medium text-green-700">
                Successfully connected to {agencyName}.
              </p>
            </div>
            <Button onClick={onDisconnect} variant="outline" className="w-full" disabled={isLoading}>
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center p-3 rounded-md bg-red-50 border border-red-200">
               <XCircle className="h-5 w-5 text-red-500 mr-2" />
               <p className="text-sm font-medium text-red-700">Not connected to GoHighLevel.</p>
            </div>
            <Button onClick={onConnect} className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              <LogIn className="mr-2 h-4 w-4" />
              Connect to GoHighLevel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
