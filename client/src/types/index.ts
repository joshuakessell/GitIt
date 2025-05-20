export interface ExplanationSettings {
  detailLevel: "basic" | "standard" | "advanced";
  includeComments: boolean;
  outputFormat: "plain" | "markdown" | "html";
  includeComplexity: boolean;
  includeEdgeCases: boolean;
  includeImprovements: boolean;
}

export interface CodeToTextRequest {
  code: string;
  language: string;
  settings?: ExplanationSettings;
}

export interface TextToCodeRequest {
  description: string;
  language: string;
}

export interface CodeExplanationResponse {
  explanation: string;
}

export interface CodeGenerationResponse {
  code: string;
}

export interface HistoryItem {
  id: number;
  title: string;
  language: string;
  createdAt: string;
  type: "code-to-text" | "text-to-code";
}

export interface LanguageOption {
  value: string;
  label: string;
}
