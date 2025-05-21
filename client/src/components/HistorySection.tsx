import { HistoryItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { Code, FileText, Loader } from "lucide-react";
import { getLanguageLabel } from "@/lib/languages";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface HistorySectionProps {
  historyItems?: HistoryItem[];
}

export function HistorySection({ historyItems = [] }: HistorySectionProps) {
  const { isAuthenticated } = useAuth();
  
  // Fetch history items from the API if user is authenticated
  const { data: fetchedItems, isLoading } = useQuery<HistoryItem[]>({
    queryKey: ['/api/history'],
    enabled: isAuthenticated,
    retry: false
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Activity</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 flex justify-center">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <Loader className="h-8 w-8 animate-spin mb-2" />
            <p>Loading your history...</p>
          </div>
        </div>
      </div>
    );
  }

  // If user provided items directly, use those
  // Otherwise use fetched items if available
  // Otherwise empty array (no placeholders)
  const itemsToRender = historyItems.length > 0 
    ? historyItems 
    : (fetchedItems || []);

  // When there are no items to show
  if (itemsToRender.length === 0) {
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Activity</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-8">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400 text-center">
            <FileText className="h-10 w-10 mb-3 opacity-40" />
            <h3 className="text-lg font-medium mb-2">No history yet</h3>
            <p className="max-w-md">
              Your recent code explanations and generations will appear here after you use the app.
              {!isAuthenticated && (
                <span className="block mt-2 text-indigo-600 dark:text-indigo-400">
                  Sign in to save your history across sessions.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Recent Activity</h2>
        {itemsToRender.length > 5 && (
          <button className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
            View all
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-all duration-200">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {itemsToRender.map((item) => (
            <li key={item.id} className="transform hover:scale-[1.01] transition-transform">
              <a href="#" className="block hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                        item.type === "code-to-text" 
                          ? "bg-indigo-100 dark:bg-indigo-900" 
                          : "bg-purple-100 dark:bg-purple-900"
                      }`}>
                        {item.type === "code-to-text" ? (
                          <Code className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        )}
                      </span>
                      <p className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {item.title}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {getLanguageLabel(item.language)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <svg
                          className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{formatDate(item.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
