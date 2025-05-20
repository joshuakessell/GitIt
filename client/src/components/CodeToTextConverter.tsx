import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Markdown } from "@/components/ui/markdown";
import { AdvancedOptions } from "@/components/AdvancedOptions";
import { Loader2, Copy, Download, FileText, Trash, AlertCircle, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeToTextRequest, ExplanationSettings, CodeExplanationResponse } from "@/types";
import { languages } from "@/lib/languages";
import { fetchSampleCode } from "@/lib/samples";
import { useToast } from "@/hooks/use-toast";

// Debounce function for handling input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Validate code syntax
function validateCodeSyntax(code: string, language: string): { valid: boolean; message?: string } {
  if (!code.trim()) {
    return { valid: false, message: "Code cannot be empty" };
  }

  // Basic code structure validation
  if (language === 'javascript' || language === 'typescript') {
    // Check for mismatched brackets or parentheses
    const brackets = code.match(/[{}\[\]()]/g) || [];
    const stack = [];
    
    const pairs: Record<string, string> = {
      '}': '{',
      ']': '[',
      ')': '(',
    };
    
    for (const bracket of brackets) {
      if (bracket === '{' || bracket === '[' || bracket === '(') {
        stack.push(bracket);
      } else if (stack.pop() !== pairs[bracket]) {
        return { valid: false, message: "Mismatched brackets or parentheses" };
      }
    }
    
    if (stack.length !== 0) {
      return { valid: false, message: "Mismatched brackets or parentheses" };
    }
  }

  return { valid: true };
}

export function CodeToTextConverter() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [settings, setSettings] = useState<ExplanationSettings>({
    detailLevel: "standard",
    includeComments: true,
    outputFormat: "markdown",
    includeComplexity: true,
    includeEdgeCases: true,
    includeImprovements: true,
  });
  const [validationState, setValidationState] = useState<{ valid: boolean; message?: string }>({ valid: true });
  const [processingProgress, setProcessingProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Use debounced code to avoid unnecessary validations
  const debouncedCode = useDebounce(code, 500);

  // Validate code when it changes
  useEffect(() => {
    if (debouncedCode) {
      const validationResult = validateCodeSyntax(debouncedCode, language === 'auto' ? 'javascript' : language);
      setValidationState(validationResult);
    } else {
      setValidationState({ valid: true });
    }
  }, [debouncedCode, language]);

  // Mutation for code explanation
  const mutation = useMutation({
    mutationFn: async (request: CodeToTextRequest) => {
      // Start fake progress animation
      setProcessingProgress(0);
      progressInterval.current = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) {
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      try {
        const response = await apiRequest("POST", "/api/explain", request);
        const data = await response.json() as CodeExplanationResponse;
        return data;
      } finally {
        // Clear interval and set to 100% when done
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
        setProcessingProgress(100);
      }
    },
    onError: (error) => {
      // Clear progress on error
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      setProcessingProgress(0);
      
      // Show detailed error toast
      toast({
        title: "Failed to explain code",
        description: error instanceof Error 
          ? error.message 
          : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Clean up progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const handleExplainCode = async () => {
    // Validate code first
    const validation = validateCodeSyntax(code, language === 'auto' ? 'javascript' : language);
    
    if (!validation.valid) {
      toast({
        title: "Invalid code syntax",
        description: validation.message || "Please check your code for syntax errors.",
        variant: "destructive",
      });
      return;
    }

    if (!code.trim()) {
      toast({
        title: "Code required",
        description: "Please enter some code to explain.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({ code, language, settings });
  };

  const handlePasteSample = async () => {
    try {
      const sampleCode = await fetchSampleCode(language === 'auto' ? 'javascript' : language);
      if (sampleCode) {
        setCode(sampleCode);
      }
    } catch (error) {
      toast({
        title: "Error loading sample",
        description: "Failed to load sample code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyExplanation = () => {
    if (mutation.data?.explanation) {
      navigator.clipboard.writeText(mutation.data.explanation);
      toast({
        title: "Copied to clipboard",
        description: "Explanation copied to clipboard successfully.",
      });
    }
  };

  const handleDownloadExplanation = () => {
    if (!mutation.data?.explanation) return;

    const blob = new Blob([mutation.data.explanation], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-explanation-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRetry = () => {
    if (mutation.isError) {
      handleExplainCode();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Input Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium">Code Input</h2>
            <div className="flex space-x-2">
              <Select value={language} onValueChange={setLanguage} aria-label="Programming language selector">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCode("")}
                title="Clear code"
                aria-label="Clear code"
                disabled={!code}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            {!validationState.valid && debouncedCode && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Syntax Warning</AlertTitle>
                <AlertDescription>
                  {validationState.message || "Your code may have syntax errors."}
                </AlertDescription>
              </Alert>
            )}
            
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language === 'auto' ? 'javascript' : language}
              placeholder="Paste your code here..."
              className="mb-4"
              aria-label="Code editor"
            />
            
            {/* Advanced Options Inside Code Input Box */}
            <div className="mb-4 bg-gray-50 p-3 rounded-md dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium mb-2">Advanced Settings</h3>
              <AdvancedOptions settings={settings} onSettingsChange={setSettings} />
            </div>
            
            <div className="mt-4 flex justify-between">
              <Button
                variant="link"
                size="sm"
                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 p-0"
                onClick={handlePasteSample}
                aria-label="Load sample code"
              >
                Paste sample code
              </Button>
              <Button 
                onClick={handleExplainCode} 
                disabled={mutation.isPending || !code.trim()} 
                aria-label="Explain code"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Explain Code
                    <FileText className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Explanation Output Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium">Explanation</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyExplanation}
                disabled={!mutation.data}
                title="Copy explanation"
                aria-label="Copy explanation to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownloadExplanation}
                disabled={!mutation.data}
                title="Download explanation"
                aria-label="Download explanation as Markdown"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 relative">
            {/* Loading State */}
            {mutation.isPending && (
              <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex flex-col items-center justify-center z-10">
                <div className="flex flex-col items-center w-full max-w-md">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mb-4"></div>
                  <Progress value={processingProgress} className="w-full mb-3" aria-label="Analysis progress" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {processingProgress < 30 
                      ? "Parsing your code..." 
                      : processingProgress < 60
                      ? "Analyzing structure and logic..." 
                      : processingProgress < 90
                      ? "Generating explanation..." 
                      : "Finalizing results..."}
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {mutation.isError && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                      Error processing your code
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                      <p>
                        {mutation.error instanceof Error
                          ? mutation.error.message
                          : "Failed to analyze the provided code. Please check your input and try again."}
                      </p>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" onClick={handleRetry}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!mutation.data && !mutation.isPending && !mutation.isError && (
              <div className="h-80 flex items-center justify-center text-center">
                <div className="max-w-sm">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Enter your code and click "Explain Code" to see a detailed
                    explanation in plain English
                  </p>
                </div>
              </div>
            )}

            {/* Content State */}
            {mutation.isSuccess && mutation.data && (
              <div className="h-80 overflow-y-auto code-area">
                <Alert className="mb-4 border-green-500/50 text-green-700 dark:border-green-500 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>Analysis Complete</AlertTitle>
                  <AlertDescription>
                    {language === 'auto' ? "Language was automatically detected" : `Code analyzed as ${language}`}
                  </AlertDescription>
                </Alert>
                <Markdown content={mutation.data.explanation} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
