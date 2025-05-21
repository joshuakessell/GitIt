import { MoveRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Made with 
            </span>
            <span role="img" aria-label="Heart" className="text-lg text-red-500">
              ❤️
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              by Joshua Kessell
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
