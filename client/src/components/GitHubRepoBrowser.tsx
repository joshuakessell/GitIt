import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function GitHubRepoBrowser() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium">GitHub Repository Browser</h2>
        </div>
        <div className="p-6 text-center">
          <div className="max-w-md mx-auto">
            <Github className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-lg font-medium">Connect to GitHub</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Connect your GitHub account to access and analyze code from your repositories directly.
            </p>
            <div className="mt-6">
              <Button
                variant="outline"
                className="gap-2"
              >
                <Github className="h-4 w-4" />
                Connect with GitHub
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
