import { useState, useEffect } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { languages } from "@/lib/languages";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder = "Enter your code here...",
  className,
  readOnly = false,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Convert language to prism format if needed
  const languageMapping: Record<string, string> = {
    javascript: "javascript",
    typescript: "typescript",
    python: "python",
    java: "java",
    csharp: "csharp",
    go: "go",
    ruby: "ruby",
    php: "php",
    rust: "rust",
    swift: "swift",
    kotlin: "kotlin",
    c: "c",
    cpp: "cpp",
  };

  const prismLanguage = languageMapping[language] || "javascript";

  return (
    <div
      className={cn(
        "relative font-mono w-full h-80 overflow-auto rounded-md code-area",
        "bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700",
        "focus-within:ring-1 focus-within:ring-primary-500 focus-within:border-primary-500",
        isFocused ? "ring-1 ring-primary-500 border-primary-500" : "",
        className
      )}
    >
      {/* Single central placeholder that disappears on focus or when there's content */}
      {!value && !isFocused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
        </div>
      )}
      
      <div className="relative h-full">
        {/* Invisible textarea for input capture */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 w-full h-full p-3 font-mono resize-none opacity-0 z-10"
          spellCheck="false"
          readOnly={readOnly}
          aria-label={`Code editor for ${language}`}
        />
        
        {/* Syntax highlighted code preview */}
        <Highlight
          theme={theme === "dark" ? themes.vsDark : themes.vsLight}
          code={value || ""}
          language={prismLanguage}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn(
                className,
                "py-3 px-3 h-full w-full overflow-auto whitespace-pre-wrap break-words"
              )}
              style={style}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </div>
              ))}
              {/* Add an extra line to make sure there's always content to scroll to */}
              {value && <div>&nbsp;</div>}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
