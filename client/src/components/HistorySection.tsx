import { HistoryItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { Code, FileText } from "lucide-react";
import { getLanguageLabel } from "@/lib/languages";

interface HistorySectionProps {
  historyItems?: HistoryItem[];
}

export function HistorySection({ historyItems = [] }: HistorySectionProps) {
  // If no history items provided, show placeholder items
  const placeholderItems: HistoryItem[] = [
    {
      id: 1,
      title: "Recursive Fibonacci function",
      language: "javascript",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      type: "code-to-text",
    },
    {
      id: 2,
      title: "API authentication middleware",
      language: "python",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      type: "text-to-code",
    },
  ];

  const itemsToRender = historyItems.length > 0 ? historyItems : placeholderItems;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Recent Activity</h2>
        <button className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300">
          View all
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {itemsToRender.map((item) => (
            <li key={item.id}>
              <a href="#" className="block hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900">
                        {item.type === "code-to-text" ? (
                          <Code className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        )}
                      </span>
                      <p className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
