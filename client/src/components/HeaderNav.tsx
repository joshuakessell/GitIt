import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Code, 
  Moon, 
  Sun,
  Github
} from "lucide-react";

interface HeaderNavProps {
  isLoggedIn?: boolean;
  username?: string;
}

export function HeaderNav({ isLoggedIn = false, username }: HeaderNavProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Code className="h-6 w-6 text-primary-500" />
            </div>
            <h1 className="ml-2 text-xl font-semibold">AI Code Explainer</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {isLoggedIn ? (
              <div className="flex items-center">
                <span className="text-sm mr-2">{username}</span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="gap-2"
                  onClick={() => window.location.href = '/api/auth/github'}
                >
                  <Github className="h-4 w-4" />
                  Login with GitHub
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
