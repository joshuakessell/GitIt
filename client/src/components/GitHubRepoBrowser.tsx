import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Github, 
  Upload, 
  Loader2, 
  FileArchive, 
  ExternalLink, 
  BookOpen,
  FileCode,
  AlertCircle,
  FolderGit,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  Database
} from "lucide-react";
import { 
  RepositoryAnalysisRequest, 
  RepositoryAnalysisResponse,
  RepositoryAnalysisListItem
} from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

interface GitHubRepoBrowserProps {
  isAuthenticated?: boolean;
}

export function GitHubRepoBrowser({ isAuthenticated = false }: GitHubRepoBrowserProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [repoName, setRepoName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<string>("technical");
  const [recentAnalyses, setRecentAnalyses] = useState<RepositoryAnalysisListItem[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<RepositoryAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false);
  
  // Fetch user's GitHub repositories
  const { data: userRepos, isLoading: isLoadingRepos } = useQuery({
    queryKey: ["/api/github/repositories"],
    enabled: isAuthenticated,
    retry: false
  });
  
  // Simulated progress function for analysis animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAnalyzing && !analysisComplete) {
      // Start at 0 and progress to 95% during analysis
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          // Increase progressively slower as we approach 95%
          const increment = Math.max(0.5, (100 - prev) * 0.05);
          const newProgress = Math.min(95, prev + increment);
          return newProgress;
        });
      }, 300);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing, analysisComplete]);

  // Mutation for GitHub repository analysis
  const githubMutation = useMutation({
    mutationFn: async (request: RepositoryAnalysisRequest) => {
      const response = await apiRequest("POST", "/api/analyze/github", request);
      const data = await response.json();
      return data as RepositoryAnalysisResponse;
    },
  });

  // Mutation for uploading and analyzing zip file
  const uploadMutation = useMutation({
    mutationFn: async ({ file, repositoryName }: { file: File, repositoryName: string }) => {
      const formData = new FormData();
      formData.append("repository", file);
      formData.append("repositoryName", repositoryName);

      const response = await fetch("/api/analyze/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload and analyze repository");
      }

      const data = await response.json();
      return data as RepositoryAnalysisResponse;
    },
  });

  const handleGitHubAnalysis = async () => {
    if (!repoUrl) {
      toast({
        title: "Repository URL required",
        description: "Please enter a GitHub repository URL",
        variant: "destructive",
      });
      return;
    }

    // Enhanced URL validation
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?.*$/;
    if (!githubUrlPattern.test(repoUrl)) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)",
        variant: "destructive",
      });
      return;
    }

    // Remove trailing slashes, .git extension, and query parameters
    const cleanedUrl = repoUrl.replace(/\/+$/, '').replace(/\.git$/, '').split('?')[0];

    try {
      // Start analysis animation
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisComplete(false);
      
      const extractedRepoName = extractRepoNameFromUrl(cleanedUrl);
      
      const result = await githubMutation.mutateAsync({
        repositoryUrl: cleanedUrl,
        repositoryName: repoName || extractedRepoName,
      });

      // Show completion animation
      setAnalysisProgress(100);
      setAnalysisComplete(true);
      
      // Delay showing the result to allow for completion animation
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisComplete(false);
        setSelectedAnalysis(result);
        setActiveResultTab("technical");
      }, 1500);
      
    } catch (error) {
      // Reset analysis state
      setIsAnalyzing(false);
      setAnalysisComplete(false);
      
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze repository",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a ZIP file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Try to use the zip filename (without extension) as the default repo name
    if (!repoName) {
      const fileName = file.name.replace(/\.zip$/, "");
      setRepoName(fileName);
    }
  };

  const handleUploadAnalysis = async () => {
    if (!selectedFile) {
      toast({
        title: "File required",
        description: "Please select a ZIP file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!repoName) {
      toast({
        title: "Repository name required",
        description: "Please enter a name for your repository",
        variant: "destructive",
      });
      return;
    }

    try {
      // Start analysis animation
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisComplete(false);
      
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        repositoryName: repoName,
      });

      // Show completion animation
      setAnalysisProgress(100);
      setAnalysisComplete(true);
      
      // Delay showing the result to allow for completion animation
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisComplete(false);
        setSelectedAnalysis(result);
        setActiveResultTab("technical");
      }, 1500);
    } catch (error) {
      // Reset analysis state
      setIsAnalyzing(false);
      setAnalysisComplete(false);
      
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze repository",
        variant: "destructive",
      });
    }
  };

  // Helper function to extract repository name from GitHub URL
  const extractRepoNameFromUrl = (url: string): string => {
    const parts = url.split("/");
    const repoNameWithExtension = parts[parts.length - 1];
    return repoNameWithExtension.replace(/\.git$/, "");
  };

  // Full-screen loading animation when analyzing a repository
  if (isAnalyzing) {
    return (
      <div className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl text-center">
          <div className="mb-6">
            {analysisComplete ? (
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Database className="h-8 w-8 text-primary-500 dark:text-primary-400 animate-pulse" />
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-medium mb-2">
            {analysisComplete ? "Analysis Complete!" : "Analyzing Repository"}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {analysisComplete 
              ? "Successfully analyzed your repository. Loading results..." 
              : "Our AI is processing your code to provide detailed insights..."
            }
          </p>
          
          <div className="mb-2">
            <Progress value={analysisProgress} className="h-2" />
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {analysisComplete 
              ? "100% Complete" 
              : `${Math.round(analysisProgress)}% Complete`
            }
          </p>
        </div>
      </div>
    );
  }

  // Show analysis results if we have them
  if (selectedAnalysis) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium">Repository Analysis: {selectedAnalysis.repositoryName}</h2>
            <Button 
              variant="outline"
              onClick={() => setSelectedAnalysis(null)}
            >
              Analyze Another Repository
            </Button>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analyzed {selectedAnalysis.analyzedFiles} of {selectedAnalysis.totalFiles} files
                </p>
                {selectedAnalysis.repositoryUrl && (
                  <a 
                    href={selectedAnalysis.repositoryUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 flex items-center mt-1"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View on GitHub
                  </a>
                )}
              </div>
            </div>

            <Tabs value={activeResultTab} onValueChange={setActiveResultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="technical" className="flex items-center">
                  <FileCode className="h-4 w-4 mr-2" />
                  Technical Analysis
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  User Manual
                </TabsTrigger>
              </TabsList>
              <TabsContent value="technical" className="mt-4">
                <div className="h-[600px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <Markdown content={selectedAnalysis.technicalAnalysis} />
                </div>
              </TabsContent>
              <TabsContent value="manual" className="mt-4">
                <div className="h-[600px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <Markdown content={selectedAnalysis.userManual} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  // Show the repository input forms
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium">Repository Analyzer</h2>
        </div>
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center justify-center">
                <FileArchive className="h-4 w-4 mr-2" />
                Zip File
              </TabsTrigger>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <TabsTrigger 
                        value="github" 
                        className={cn(
                          "flex items-center justify-center w-full",
                          !isAuthenticated && "opacity-70 cursor-not-allowed"
                        )}
                        disabled={!isAuthenticated}
                        onClick={(e) => {
                          if (!isAuthenticated) e.preventDefault();
                        }}
                      >
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  {!isAuthenticated && (
                    <TooltipContent>
                      <p className="text-sm">Sign in with GitHub to analyze your repositories</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </TabsList>
            
            <TabsContent value="upload" className="mt-4 space-y-4">
              <div>
                <Label htmlFor="repository-name" className="block text-sm font-medium mb-1">
                  Repository Name
                </Label>
                <Input
                  id="repository-name"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="Enter a name for your repository"
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="repository-file" className="block text-sm font-medium mb-1">
                  Repository Zip File
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="repository-file"
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUploadAnalysis} 
                    disabled={uploadMutation.isPending || !selectedFile}
                    className="whitespace-nowrap"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Analyze
                      </>
                    )}
                  </Button>
                </div>
                {selectedFile && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Selected file: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-md text-sm flex items-start mt-4">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                <div>
                  <p className="font-medium mb-1">Upload your repository as a ZIP file</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Maximum file size: 50MB</li>
                    <li>The analysis will be performed using AI to understand your codebase</li>
                    <li>You'll receive a detailed technical analysis and user manual</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="github" className="mt-4 space-y-4">
              {isAuthenticated && (
                <div>
                  <h3 className="text-base font-medium mb-2">Your GitHub Repositories</h3>
                  
                  {isLoadingRepos ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    </div>
                  ) : userRepos && userRepos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {userRepos.map((repo: any) => (
                        <Card key={repo.id} className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-md font-medium flex items-center">
                              <FolderGit className="h-4 w-4 mr-2 text-primary-500" />
                              {repo.name}
                            </CardTitle>
                            <CardDescription className="text-xs line-clamp-1">
                              {repo.description || "No description available"}
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="pt-2 flex justify-between">
                            <a 
                              href={repo.html_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View on GitHub
                            </a>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => {
                                setRepoUrl(repo.html_url);
                                setRepoName(repo.name);
                                handleGitHubAnalysis();
                              }}
                            >
                              Analyze
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : userRepos ? (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-md text-center mb-4">
                      <p>No GitHub repositories found for your account.</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-4 rounded-md mb-4">
                      <p className="text-yellow-800 dark:text-yellow-200">
                        Could not fetch your GitHub repositories. Please try again later.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <h3 className="text-base font-medium mb-2">Analyze Any Public Repository</h3>
                <div>
                  <Label htmlFor="github-url" className="block text-sm font-medium mb-1">
                    GitHub Repository URL
                  </Label>
                  <Input
                    id="github-url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full bg-white dark:bg-gray-900"
                  />
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="repository-name-github" className="block text-sm font-medium mb-1">
                    Repository Name (Optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="repository-name-github"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="Enter a custom name or leave blank to use the repository name"
                      className="flex-1 bg-white dark:bg-gray-900"
                    />
                    <Button 
                      onClick={handleGitHubAnalysis} 
                      disabled={githubMutation.isPending || !repoUrl}
                      className="whitespace-nowrap"
                    >
                      {githubMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Github className="mr-2 h-4 w-4" />
                          Analyze Repository
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-md text-sm flex items-start mt-4">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                <div>
                  <p className="font-medium mb-1">Analyze a public GitHub repository</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Enter the full URL to a GitHub repository (e.g., https://github.com/username/repository)</li>
                    <li>Only public repositories can be analyzed without authentication</li>
                    <li>The analysis will be performed using AI to understand the codebase</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
