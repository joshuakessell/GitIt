import { useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { queryClient } from "./lib/queryClient";
import { HeaderNav } from "@/components/HeaderNav";
import { TabNavigation } from "@/components/TabNavigation";
import { CodeToTextConverter } from "@/components/CodeToTextConverter";
import { TextToCodeConverter } from "@/components/TextToCodeConverter";
import { GitHubRepoBrowser } from "@/components/GitHubRepoBrowser";
import { HistorySection } from "@/components/HistorySection";
import { Footer } from "@/components/Footer";
import NotFound from "@/pages/not-found";
import HistoryPage from "./pages/history";
import { useAuth } from "@/hooks/useAuth";

type TabKey = "code-to-text" | "text-to-code" | "repo-browser";

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("code-to-text");
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // All users can access the Repository Analyzer page now
  // No need to redirect away from repo-browser if not authenticated

  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <TooltipProvider>
        <HeaderNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <TabNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            isAuthenticated={isAuthenticated} 
          />
          
          {activeTab === "code-to-text" && <CodeToTextConverter />}
          {activeTab === "text-to-code" && <TextToCodeConverter />}
          {activeTab === "repo-browser" && <GitHubRepoBrowser isAuthenticated={isAuthenticated} />}
          
          <HistorySection />
        </main>
        <Footer />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={App} />
      <Route path="/history" component={() => 
        <QueryClientProvider client={queryClient}>
          <HistoryPage />
        </QueryClientProvider>
      } />
      <Route component={NotFound} />
    </Switch>
  );
}

export default Router;
