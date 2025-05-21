import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Code, 
  Moon, 
  Sun,
  Github,
  LogOut
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AuthData {
  isAuthenticated: boolean;
  user?: {
    id: string;
    username: string;
    githubUsername?: string;
  };
}

export function HeaderNav() {
  const { theme, toggleTheme } = useTheme();
  
  // Fetch auth status from server
  const { data: authData } = useQuery<AuthData>({
    queryKey: ['/api/auth/user'],
    retry: false
  });

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
            
            {authData?.isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm">{authData.user?.username || "User"}</span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {(authData.user?.username?.[0] || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/api/auth/logout'}
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
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