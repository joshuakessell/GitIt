import { cn } from "@/lib/utils";
import { 
  Code, 
  FileText, 
  FolderGit,
  DatabaseBackup
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TabKey = "code-to-text" | "text-to-code" | "repo-browser";

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isAuthenticated?: boolean;
}

export function TabNavigation({ activeTab, onTabChange, isAuthenticated = false }: TabNavigationProps) {
  // All tabs are always shown
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "code-to-text", label: "Code to Text", icon: <Code className="h-4 w-4 mr-1" /> },
    { key: "text-to-code", label: "Text to Code", icon: <FileText className="h-4 w-4 mr-1" /> },
    { key: "repo-browser", label: "Repository Analyzer", icon: <DatabaseBackup className="h-4 w-4 mr-1" /> },
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
      <div className="hidden sm:block mb-6 animate-fadeIn">
        <nav className="flex space-x-4 p-1">
          {tabs.map((tab, index) => {
            // We no longer need to show authentication tooltip on the main tab
            // since Repository Analyzer is fully accessible to all users
            const isRepoTab = tab.key === "repo-browser";
            const needsAuthTooltip = false; // All users can access the Repository Analyzer page
            
            // Wrap the button in a tooltip if needed
            const tabButton = (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-200 relative group",
                  activeTab === tab.key
                    ? "bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                  // Add a slightly dimmed appearance if it's the repo tab and user is not authenticated
                  needsAuthTooltip && "opacity-80"
                )}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <span className="mr-2 transition-transform duration-200 transform group-hover:scale-110">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-full animate-fadeIn" />
                )}
              </button>
            );
            
            // Return with tooltip if needed, otherwise just the button
            return needsAuthTooltip ? (
              <TooltipProvider key={tab.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {tabButton}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Sign in with GitHub to unlock all repository features</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              tabButton
            );
          })}
        </nav>
      </div>
    </>
  );
}
