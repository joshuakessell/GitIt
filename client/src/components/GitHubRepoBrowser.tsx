import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import { useToast } from "@/hooks/use-toast";
import { 
  Github, 
  Upload, 
  Loader2, 
  FileArchive, 
  ExternalLink, 
  BookOpen,
  FileCode,
  AlertCircle
} from "lucide-react";
import { 
  RepositoryAnalysisRequest, 
  RepositoryAnalysisResponse,
  RepositoryAnalysisListItem
} from "@/types";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

export function GitHubRepoBrowser() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [repoName, setRepoName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<string>("technical");
  const [recentAnalyses, setRecentAnalyses] = useState<RepositoryAnalysisListItem[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<RepositoryAnalysisResponse | null>(null);

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

    // Basic URL validation
    if (!repoUrl.includes("github.com")) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await githubMutation.mutateAsync({
        repositoryUrl: repoUrl,
        repositoryName: repoName || extractRepoNameFromUrl(repoUrl),
      });

      setSelectedAnalysis(result);
      setActiveResultTab("technical");
    } catch (error) {
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
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        repositoryName: repoName,
      });

      setSelectedAnalysis(result);
      setActiveResultTab("technical");
    } catch (error) {
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
              <TabsTrigger value="upload" className="flex items-center">
                <FileArchive className="h-4 w-4 mr-2" />
                Upload Zip File
              </TabsTrigger>
              <TabsTrigger value="github" className="flex items-center">
                <Github className="h-4 w-4 mr-2" />
                GitHub Repository
              </TabsTrigger>
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
              <div>
                <Label htmlFor="github-url" className="block text-sm font-medium mb-1">
                  GitHub Repository URL
                </Label>
                <Input
                  id="github-url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="repository-name-github" className="block text-sm font-medium mb-1">
                  Repository Name (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="repository-name-github"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="Enter a custom name or leave blank to use the repository name"
                    className="flex-1"
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
