import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/ui/code-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextToCodeRequest, CodeGenerationResponse } from "@/types";
import { languages } from "@/lib/languages";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Loader2, FileText, Trash } from "lucide-react";

export function TextToCodeConverter() {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("javascript");

  // Mutation for text to code generation
  const mutation = useMutation({
    mutationFn: async (request: TextToCodeRequest) => {
      const response = await apiRequest("POST", "/api/generate", request);
      return (await response.json()) as CodeGenerationResponse;
    },
  });

  const handleGenerateCode = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a description of what you want the code to do.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({ description, language });
  };

  const handleShowExamples = () => {
    setDescription(
      "Create a function that takes an array of numbers and returns the sum of all positive numbers in the array."
    );
  };

  const handleCopyCode = () => {
    if (mutation.data?.code) {
      navigator.clipboard.writeText(mutation.data.code);
      toast({
        title: "Copied to clipboard",
        description: "Generated code copied to clipboard successfully.",
      });
    }
  };

  const handleDownloadCode = () => {
    if (!mutation.data?.code) return;

    // Determine file extension based on language
    const getFileExtension = (lang: string): string => {
      const extensions: Record<string, string> = {
        javascript: "js",
        typescript: "ts",
        python: "py",
        java: "java",
        csharp: "cs",
        go: "go",
        ruby: "rb",
        php: "php",
        rust: "rs",
        swift: "swift",
        kotlin: "kt",
        c: "c",
        cpp: "cpp",
      };
      return extensions[lang] || "txt";
    };

    const blob = new Blob([mutation.data.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-code.${getFileExtension(language)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Text Input Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium">Plain English Description</h2>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setDescription("")} 
                title="Clear text"
                disabled={!description}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you want the code to do..."
              className="h-80 font-sans resize-none bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
            <div className="mt-4 flex justify-between">
              <Button
                variant="link"
                size="sm"
                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 p-0"
                onClick={handleShowExamples}
              >
                Show examples
              </Button>
              <div className="flex items-center space-x-4">
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
                  onClick={handleGenerateCode} 
                  disabled={mutation.isPending || !description.trim()}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Code
                      <FileText className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Generated Code Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium">Generated Code</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                disabled={!mutation.data}
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownloadCode}
                disabled={!mutation.data}
                title="Download code"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            {/* Loading State */}
            {mutation.isPending && (
              <div className="h-80 bg-gray-100 dark:bg-gray-900 rounded-md flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Generating your code...
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {mutation.isError && (
              <div className="h-80 bg-gray-100 dark:bg-gray-900 rounded-md p-4">
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
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
                        Error generating code
                      </h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                        <p>
                          {mutation.error instanceof Error
                            ? mutation.error.message
                            : "Failed to generate code. Please check your description and try again."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!mutation.data && !mutation.isPending && !mutation.isError && (
              <div className="h-80 bg-gray-100 dark:bg-gray-900 rounded-md flex items-center justify-center">
                <div className="max-w-sm text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Enter a description and click "Generate Code" to create code based on your requirements
                  </p>
                </div>
              </div>
            )}

            {/* Content State */}
            {mutation.isSuccess && mutation.data && (
              <CodeEditor
                value={mutation.data.code}
                onChange={() => {}}
                language={language}
                readOnly
                className="h-80"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
