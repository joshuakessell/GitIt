import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { huggingFaceAPI } from "./huggingface-api";
import { openaiAPI } from "./openai-api";
import { githubAPI } from "./github-api";
import { extractFilesFromZip, cleanupTempFiles } from "./file-utils";
import uploadMiddleware, { handleUploadErrors } from "./upload-middleware";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { 
  codeToTextRequestSchema, 
  textToCodeRequestSchema,
  repositoryAnalysisRequestSchema,
  explanationSettingsSchema
} from "@shared/schema";
import { log } from "./vite";

const readFile = promisify(fs.readFile);

export async function registerRoutes(app: Express): Promise<Server> {
  // Code to text explanation route
  app.post("/api/explain", async (req, res) => {
    try {
      const parseResult = codeToTextRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: parseResult.error.format() 
        });
      }
      
      const { code, language, settings } = parseResult.data;
      const defaultSettings = explanationSettingsSchema.parse({});
      const mergedSettings = { ...defaultSettings, ...settings };
      
      // Use OpenAI API for code explanations instead of Hugging Face
      const explanation = await openaiAPI.explainCode(
        code,
        language,
        mergedSettings.detailLevel
      );
      
      // Save the explanation to history if user is logged in
      // This is not implemented as user auth is not part of the core requirements
      
      return res.json({ explanation });
    } catch (error) {
      log(`Error in /api/explain: ${error}`, "api");
      return res.status(500).json({ 
        message: "Failed to explain code",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Text to code generation route
  app.post("/api/generate", async (req, res) => {
    try {
      const parseResult = textToCodeRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: parseResult.error.format() 
        });
      }
      
      const { description, language } = parseResult.data;
      
      // Use OpenAI API for code generation instead of Hugging Face
      const code = await openaiAPI.generateCode(description, language);
      
      return res.json({ code });
    } catch (error) {
      log(`Error in /api/generate: ${error}`, "api");
      return res.status(500).json({ 
        message: "Failed to generate code",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Sample code endpoint to get examples
  app.get("/api/samples/:language", (req, res) => {
    const { language } = req.params;
    
    // Very simple samples implementation
    const samples: Record<string, string> = {
      javascript: `function fibonacci(num) {
  if (num <= 0) return [];
  if (num === 1) return [0];
  if (num === 2) return [0, 1];
  
  const result = [0, 1];
  
  for (let i = 2; i < num; i++) {
    result.push(result[i-1] + result[i-2]);
  }
  
  return result;
}`,
      python: `def fibonacci(num):
    if num <= 0:
        return []
    if num == 1:
        return [0]
    if num == 2:
        return [0, 1]
        
    result = [0, 1]
    
    for i in range(2, num):
        result.append(result[i-1] + result[i-2])
        
    return result`,
      typescript: `function fibonacci(num: number): number[] {
  if (num <= 0) return [];
  if (num === 1) return [0];
  if (num === 2) return [0, 1];
  
  const result: number[] = [0, 1];
  
  for (let i = 2; i < num; i++) {
    result.push(result[i-1] + result[i-2]);
  }
  
  return result;
}`,
    };
    
    const sample = samples[language.toLowerCase()] || "";
    
    if (!sample) {
      return res.status(404).json({ message: `No sample available for ${language}` });
    }
    
    return res.json({ sample });
  });

  // Repository analysis endpoints
  
  // Upload and analyze zip file
  app.post(
    "/api/analyze/upload", 
    uploadMiddleware.single('repository'),
    handleUploadErrors,
    async (req, res) => {
      try {
        // Check if file was uploaded
        if (!req.file) {
          return res.status(400).json({ 
            message: "No file uploaded",
            details: "Please upload a zip file containing your repository"
          });
        }
        
        const zipFilePath = req.file.path;
        const repositoryName = req.body.repositoryName || path.basename(zipFilePath, path.extname(zipFilePath));
        
        // Read the uploaded zip file
        const zipBuffer = await readFile(zipFilePath);
        
        // Extract the files from the zip
        const files = await extractFilesFromZip(zipBuffer);
        
        // Check if we have any files to analyze
        if (Object.keys(files).length === 0) {
          cleanupTempFiles(zipFilePath);
          return res.status(400).json({
            message: "No analyzable files found",
            details: "The zip file did not contain any code files that could be analyzed"
          });
        }
        
        // Analyze the repository using OpenAI
        const analysis = await openaiAPI.analyzeRepository(files, repositoryName);
        
        // Store the analysis in the database
        const savedAnalysis = await storage.saveRepositoryAnalysis({
          repositoryName,
          repositoryUrl: null,
          technicalAnalysis: analysis.technicalAnalysis,
          userManual: analysis.userManual,
          analysisSummary: analysis.analysisSummary,
          analyzedFiles: analysis.analyzedFiles,
          totalFiles: analysis.totalFiles,
          metadata: null,
          userId: null // Will be set when authentication is implemented
        });
        
        // Cleanup temp files
        cleanupTempFiles(zipFilePath);
        
        // Return the analysis results
        return res.json({
          id: savedAnalysis.id,
          repositoryName: savedAnalysis.repositoryName,
          technicalAnalysis: savedAnalysis.technicalAnalysis,
          userManual: savedAnalysis.userManual,
          analyzedFiles: savedAnalysis.analyzedFiles,
          totalFiles: savedAnalysis.totalFiles,
          analysisSummary: savedAnalysis.analysisSummary
        });
      } catch (error) {
        log(`Error in /api/analyze/upload: ${error}`, "api");
        return res.status(500).json({
          message: "Failed to analyze repository",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );
  
  // Analyze GitHub repository by URL
  app.post("/api/analyze/github", async (req, res) => {
    try {
      const parseResult = repositoryAnalysisRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: parseResult.error.format() 
        });
      }
      
      const { repositoryUrl, repositoryName } = parseResult.data;
      
      if (!repositoryUrl) {
        return res.status(400).json({ 
          message: "Repository URL is required" 
        });
      }
      
      // Set GitHub token if available
      if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        githubAPI.setToken(token);
      }
      
      // Fetch files from the GitHub repository
      const files = await githubAPI.fetchRepositoryFilesFromUrl(repositoryUrl);
      
      // Check if we have any files to analyze
      if (Object.keys(files).length === 0) {
        return res.status(400).json({
          message: "No analyzable files found",
          details: "The repository did not contain any code files that could be analyzed"
        });
      }
      
      // Analyze the repository using OpenAI
      const actualRepoName = repositoryName || repositoryUrl.split('/').pop() || 'Repository';
      const analysis = await openaiAPI.analyzeRepository(files, actualRepoName);
      
      // Store the analysis in the database
      const savedAnalysis = await storage.saveRepositoryAnalysis({
        repositoryName: actualRepoName,
        repositoryUrl,
        technicalAnalysis: analysis.technicalAnalysis,
        userManual: analysis.userManual,
        analysisSummary: analysis.analysisSummary,
        analyzedFiles: analysis.analyzedFiles,
        totalFiles: analysis.totalFiles,
        metadata: null,
        userId: null // Will be set when authentication is implemented
      });
      
      // Return the analysis results
      return res.json({
        id: savedAnalysis.id,
        repositoryName: savedAnalysis.repositoryName,
        repositoryUrl: savedAnalysis.repositoryUrl,
        technicalAnalysis: savedAnalysis.technicalAnalysis,
        userManual: savedAnalysis.userManual,
        analyzedFiles: savedAnalysis.analyzedFiles,
        totalFiles: savedAnalysis.totalFiles,
        analysisSummary: savedAnalysis.analysisSummary
      });
    } catch (error) {
      log(`Error in /api/analyze/github: ${error}`, "api");
      return res.status(500).json({
        message: "Failed to analyze GitHub repository",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get analysis history
  app.get("/api/analyses", async (req, res) => {
    try {
      // In a real app, we would filter by the logged-in user
      const analyses = await storage.getLatestRepositoryAnalyses(10);
      
      // Map to simplified response format
      const response = analyses.map(analysis => ({
        id: analysis.id,
        repositoryName: analysis.repositoryName,
        repositoryUrl: analysis.repositoryUrl,
        createdAt: analysis.createdAt,
        analyzedFiles: analysis.analyzedFiles,
        totalFiles: analysis.totalFiles,
      }));
      
      return res.json(response);
    } catch (error) {
      log(`Error in GET /api/analyses: ${error}`, "api");
      return res.status(500).json({
        message: "Failed to fetch analysis history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get a specific analysis by ID
  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      
      if (isNaN(analysisId)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }
      
      const analysis = await storage.getRepositoryAnalysis(analysisId);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      return res.json({
        id: analysis.id,
        repositoryName: analysis.repositoryName,
        repositoryUrl: analysis.repositoryUrl,
        technicalAnalysis: analysis.technicalAnalysis,
        userManual: analysis.userManual,
        analyzedFiles: analysis.analyzedFiles,
        totalFiles: analysis.totalFiles,
        analysisSummary: analysis.analysisSummary,
        createdAt: analysis.createdAt
      });
    } catch (error) {
      log(`Error in GET /api/analyses/:id: ${error}`, "api");
      return res.status(500).json({
        message: "Failed to fetch analysis",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
