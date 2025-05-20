import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Markdown } from "@/components/ui/markdown";
import { AdvancedOptions } from "@/components/AdvancedOptions";
import { Loader2, Copy, Download, FileText, Trash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeToTextRequest, ExplanationSettings, CodeExplanationResponse } from "@/types";
import { languages } from "@/lib/languages";
import { fetchSampleCode } from "@/lib/samples";
import { useToast } from "@/hooks/use-toast";

export function CodeToTextConverter() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [settings, setSettings] = useState<ExplanationSettings>({
    detailLevel: "standard",
    includeComments: true,
    outputFormat: "markdown",
    includeComplexity: true,
    includeEdgeCases: true,
    includeImprovements: true,
  });

  // Mutation for code explanation
  const mutation = useMutation({
    mutationFn: async (request: CodeToTextRequest) => {
      const response = await apiRequest("POST", "/api/explain", request);
      return (await response.json()) as CodeExplanationResponse;
    },
  });

  const handleExplainCode = async () => {
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
      const sampleCode = await fetchSampleCode(language);
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Input Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium">Code Input</h2>
            <div className="flex space-x-2">
              <Select value={language} onValueChange={setLanguage}>
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
                disabled={!code}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              placeholder="Paste your code here..."
              className="mb-4"
            />
            <div className="mt-4 flex justify-between">
              <Button
                variant="link"
                size="sm"
                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 p-0"
                onClick={handlePasteSample}
              >
                Paste sample code
              </Button>
              <Button onClick={handleExplainCode} disabled={mutation.isPending || !code.trim()}>
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
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownloadExplanation}
                disabled={!mutation.data}
                title="Download explanation"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 relative">
            {/* Loading State */}
            {mutation.isPending && (
              <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center z-10">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Analyzing your code...
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {mutation.isError && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
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
                <Markdown content={mutation.data.explanation} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Options Section */}
      <AdvancedOptions settings={settings} onSettingsChange={setSettings} />
    </div>
  );
}
