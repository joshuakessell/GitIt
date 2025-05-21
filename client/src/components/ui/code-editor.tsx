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
      {!value && !isFocused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
        </div>
      )}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 w-full h-full p-3 font-mono bg-transparent resize-none text-transparent caret-gray-800 dark:caret-gray-200 z-10"
          spellCheck="false"
          placeholder=""
          readOnly={readOnly}
          aria-label={`Code editor for ${language}`}
        />
        <Highlight
          theme={theme === "dark" ? themes.vsDark : themes.vsLight}
          code={value || ""}
          language={prismLanguage}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn(
                className,
                "py-3 px-3 overflow-auto whitespace-pre-wrap break-words"
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
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
