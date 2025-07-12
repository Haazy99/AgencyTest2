import { Zap } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <div className="flex items-center">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="ml-3 text-2xl font-semibold text-foreground">
            LeadFlow AI
          </h1>
        </div>
        {/* Future navigation or user profile can go here */}
      </div>
    </header>
  );
}
