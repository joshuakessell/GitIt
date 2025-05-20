import { useEffect, useState } from "react";
import { marked } from "marked";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (content) {
      // Configure marked options
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      
      // Convert markdown to HTML
      setHtml(marked.parse(content));
    } else {
      setHtml("");
    }
  }, [content]);

  // If there's no content, return null
  if (!content) {
    return null;
  }

  return (
    <div 
      className={cn(
        "prose dark:prose-invert prose-primary max-w-none",
        "prose-headings:font-semibold prose-a:text-primary-500",
        "prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:rounded-md prose-code:px-1",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
