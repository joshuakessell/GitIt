import { cn } from "@/lib/utils";
import { 
  Code, 
  FileText, 
  Github 
} from "lucide-react";

type TabKey = "code-to-text" | "text-to-code" | "repo-browser";

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "code-to-text", label: "Code to Text", icon: <Code className="h-4 w-4 mr-1" /> },
    { key: "text-to-code", label: "Text to Code", icon: <FileText className="h-4 w-4 mr-1" /> },
    { key: "repo-browser", label: "GitHub Repo Browser", icon: <Github className="h-4 w-4 mr-1" /> },
  ];
  
  return (
    <>
      {/* Mobile tabs */}
      <div className="sm:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as TabKey)}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Desktop tabs */}
      <div className="hidden sm:block mb-6">
        <nav className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium flex items-center",
                activeTab === tab.key
                  ? "bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
