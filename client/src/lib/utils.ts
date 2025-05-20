import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class values into a single className string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates a string to the specified maximum length and adds an ellipsis if truncated
 */
export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * Extracts a title from code snippet by looking for function/class definitions
 */
export function extractTitleFromCode(code: string, language: string): string {
  if (!code.trim()) return "Untitled Code";
  
  // Try to extract function or class name based on common patterns
  const patterns: Record<string, RegExp> = {
    javascript: /function\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=/,
    typescript: /function\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=/,
    python: /def\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+)/,
    java: /class\s+([a-zA-Z0-9_]+)|public\s+\w+\s+([a-zA-Z0-9_]+)\s*\(/,
    csharp: /class\s+([a-zA-Z0-9_]+)|public\s+\w+\s+([a-zA-Z0-9_]+)\s*\(/,
  };
  
  const pattern = patterns[language] || /function\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+)/;
  const match = code.match(pattern);
  
  if (match) {
    // Find the first non-undefined capturing group
    const name = match.slice(1).find(group => group !== undefined);
    if (name) return name;
  }
  
  // Fallback: use the first line if it's not too long
  const firstLine = code.split('\n')[0].trim();
  if (firstLine.length <= 30) return firstLine;
  
  return "Code Snippet";
}
