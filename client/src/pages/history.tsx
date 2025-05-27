import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { HistoryItem, RepositoryAnalysisListItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { getLanguageLabel } from "@/lib/languages";
import { Link } from "wouter";
import { useState } from "react";
import {
  Code,
  FileText,
  Loader,
  Clock,
  ArrowLeft,
  Folder,
  ChevronRight,
  GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("explanations");

  // Fetch explanation history
  const { 
    data: explanations = [], 
    isLoading: isExplanationsLoading 
  } = useQuery<HistoryItem[]>({
    queryKey: ['/api/history'],
    enabled: isAuthenticated,
    retry: 1
  });

  // Fetch repository analysis history
  const { 
    data: analyses = [], 
    isLoading: isAnalysesLoading 
  } = useQuery<RepositoryAnalysisListItem[]>({
    queryKey: ['/api/analyses'],
    enabled: isAuthenticated,
    retry: 1
  });

  const isLoading = isExplanationsLoading || isAnalysesLoading;

  if (!isAuthenticated) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <Card className="mt-8 bg-white dark:bg-gray-800 shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl flex items-center">
              <Clock className="h-6 w-6 mr-2 text-primary-500" />
              History
            </CardTitle>
            <CardDescription>
              View your saved explanations and analyses
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-medium mb-2">Please sign in</h3>
              <p className="max-w-md mx-auto">
                Sign in with GitHub to access your history and save your explanations across sessions.
              </p>
              <Button 
                className="mt-6 gap-2"
                onClick={() => window.location.href = '/api/auth/github'}
              >
                <GitBranch className="h-4 w-4" />
                Login with GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <Card className="mt-8 bg-white dark:bg-gray-800 shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl flex items-center">
              <Clock className="h-6 w-6 mr-2 text-primary-500" />
              History
            </CardTitle>
            <CardDescription>
              View your saved explanations and analyses
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px]">
            <Loader className="h-8 w-8 animate-spin mb-3 text-primary-500" />
            <p className="text-muted-foreground">Loading your history...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasExplanations = explanations.length > 0;
  const hasAnalyses = analyses.length > 0;
  
  // If no history at all
  if (!hasExplanations && !hasAnalyses) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <Card className="mt-8 bg-white dark:bg-gray-800 shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl flex items-center">
              <Clock className="h-6 w-6 mr-2 text-primary-500" />
              History
            </CardTitle>
            <CardDescription>
              View your saved explanations and analyses
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-medium mb-2">No history yet</h3>
              <p className="max-w-md mx-auto">
                Your recent code explanations and repository analyses will appear here after you use the app.
              </p>
              <Link href="/">
                <Button className="mt-6">
                  Get Started
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-12">
      <div className="flex items-center mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <svg className="h-8 w-8 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitIt? History
        </h1>
        <p className="text-muted-foreground">
          View and access your saved explanations and repository analyses
        </p>
      </div>
      
      <Tabs defaultValue="explanations" className="mt-6" 
        onValueChange={(value) => setActiveTab(value)}
        value={activeTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="explanations" disabled={!hasExplanations} className="relative">
            <Code className="h-4 w-4 mr-2" />
            Code Explanations
            {hasExplanations && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100">
                {explanations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analyses" disabled={!hasAnalyses}>
            <Folder className="h-4 w-4 mr-2" />
            Repository Analyses
            {hasAnalyses && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100">
                {analyses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="explanations" className="space-y-4">
          {hasExplanations ? (
            <div className="grid gap-4">
              {explanations.map((item) => (
                <Card key={item.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {item.type === "code-to-text" ? (
                        <Code className="h-4 w-4 text-primary-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary-500" />
                      )}
                      {item.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3">
                      <span>{getLanguageLabel(item.language)}</span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded p-3 font-mono text-sm overflow-x-auto max-h-24 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{item.codePreview}</pre>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      {item.type === "code-to-text" ? "Code Explanation" : "Code Generation"}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => viewExplanationDetails(item.id)}>
                      View Details
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No code explanations yet</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analyses" className="space-y-4">
          {hasAnalyses ? (
            <div className="grid gap-4">
              {analyses.map((analysis) => (
                <Card key={analysis.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Folder className="h-4 w-4 text-primary-500" />
                      {analysis.repositoryName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3">
                      <span>{analysis.repositoryUrl || "Uploaded Repository"}</span>
                      <span>•</span>
                      <span>{formatDate(analysis.createdAt)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <div className="flex justify-between mb-2">
                        <span>Files Analyzed:</span>
                        <span className="font-medium">{analysis.analyzedFiles} / {analysis.totalFiles}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      Repository Analysis
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => viewAnalysisDetails(analysis.id)}>
                      View Details
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No repository analyses yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions to view details
function viewExplanationDetails(id: number) {
  // This would ideally navigate to a detail page
  // For now, we'll just show a toast
  console.log("View explanation details for ID:", id);
  alert("View explanation details: " + id);
}

function viewAnalysisDetails(id: number) {
  // This would ideally navigate to a detail page
  console.log("View analysis details for ID:", id);
  alert("View analysis details: " + id);
}