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
              <svg className="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>
            <h1 className="ml-2 text-xl font-semibold">GitIt?</h1>
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
                  onClick={() => {
                    // Log the action for debugging
                    console.log("Initiating GitHub login flow");
                    
                    // Create a direct link element to ensure proper navigation
                    const link = document.createElement('a');
                    link.href = '/api/auth/github';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
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