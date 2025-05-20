import { LanguageOption } from "@/types";

export const languages: LanguageOption[] = [
  { value: "auto", label: "Detect Language" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
];

export const getLanguageLabel = (value: string): string => {
  const language = languages.find(lang => lang.value === value);
  return language ? language.label : value;
};
