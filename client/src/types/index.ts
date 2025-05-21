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
  codePreview?: string;
}

export interface LanguageOption {
  value: string;
  label: string;
}

// Repository analysis types
export interface RepositoryAnalysisRequest {
  repositoryUrl?: string;
  repositoryName: string;
  githubUsername?: string;
}

export interface RepositoryAnalysisUploadRequest {
  repositoryName: string;
  file: File;
}

export interface RepositoryAnalysisResponse {
  id: number;
  repositoryName: string;
  repositoryUrl?: string;
  technicalAnalysis: string;
  userManual: string;
  analyzedFiles: number;
  totalFiles: number;
  analysisSummary?: string;
  createdAt?: string;
}

export interface RepositoryAnalysisListItem {
  id: number;
  repositoryName: string;
  repositoryUrl?: string;
  analyzedFiles: number;
  totalFiles: number;
  createdAt: string;
}
