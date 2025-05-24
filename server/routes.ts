import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { huggingFaceAPI } from "./huggingface-api";
import { openaiAPI } from "./openai-api";
import { githubAPI } from "./github-api";
import { extractFilesFromZip, cleanupTempFiles } from "./file-utils";
import uploadMiddleware, { handleUploadErrors } from "./upload-middleware";
import { ensureAuthenticated } from "./auth";
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
import { cache } from "./cache";
import { logger } from "./logger";

const readFile = promisify(fs.readFile);

// Extract a title from code snippet
function extractCodeTitle(code: string, language: string): string {
  // Try to extract a title based on function or class names
  const functionMatches: Record<string, RegExp> = {
    // Match function declarations in different languages
    javascript: /function\s+([a-zA-Z0-9_]+)\s*\(/,
    typescript: /function\s+([a-zA-Z0-9_]+)\s*\(|([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:|class\s+([a-zA-Z0-9_]+)/,
    python: /def\s+([a-zA-Z0-9_]+)\s*\(|class\s+([a-zA-Z0-9_]+)/,
    java: /public\s+(?:static\s+)?(?:class|void|[a-zA-Z0-9_<>]+)\s+([a-zA-Z0-9_]+)(?:\s*\(|\s*\{)/,
    csharp: /public\s+(?:static\s+)?(?:class|void|[a-zA-Z0-9_<>]+)\s+([a-zA-Z0-9_]+)(?:\s*\(|\s*\{)/,
    go: /func\s+([a-zA-Z0-9_]+)\s*\(|type\s+([a-zA-Z0-9_]+)\s+struct/,
    ruby: /def\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+)/,
    php: /function\s+([a-zA-Z0-9_]+)\s*\(|class\s+([a-zA-Z0-9_]+)/,
    rust: /fn\s+([a-zA-Z0-9_]+)\s*\(|struct\s+([a-zA-Z0-9_]+)/,
    swift: /func\s+([a-zA-Z0-9_]+)\s*\(|class\s+([a-zA-Z0-9_]+)/,
  };

  // Default to JavaScript regex if language not found or set to auto
  const languageRegex = functionMatches[language.toLowerCase()] || functionMatches.javascript;
  
  // Extract name
  const match = code.match(languageRegex);
  if (match) {
    // Return the first captured group that isn't undefined
    for (let i = 1; i < match.length; i++) {
      if (match[i]) {
        return `${match[i]} ${language.toLowerCase() !== 'auto' ? `(${language})` : ''}`;
      }
    }
  }
  
  // If no match found, try to get first non-empty line that's not a comment
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('/*')) {
      // Return a truncated version of the first meaningful line
      const shortened = trimmedLine.length > 30 ? trimmedLine.substring(0, 30) + '...' : trimmedLine;
      return shortened;
    }
  }
  
  // Default title
  return language !== 'auto' ? `Code snippet (${language})` : 'Code snippet';
}

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
      
      // Get a title for the explanation based on the code
      const title = extractCodeTitle(code, language) || "Code explanation";
      
      // Save the explanation to history if user is logged in
      if (req.isAuthenticated()) {
        try {
          const userId = (req.user as any).id;
          await storage.saveExplanation({
            userId,
            title,
            code,
            explanation,
            language,
            type: "code-to-text"
          });
        } catch (saveError) {
          log(`Error saving explanation to history: ${saveError}`, "api");
          // Continue even if saving fails
        }
      }
      
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
      
      // Create a title based on the description
      const title = description.length > 40 
        ? description.substring(0, 40) + "..." 
        : description;
      
      // Save the code generation to history if user is logged in
      if (req.isAuthenticated()) {
        try {
          const userId = (req.user as any).id;
          await storage.saveExplanation({
            userId,
            title,
            code,
            explanation: description,
            language,
            type: "text-to-code"
          });
        } catch (saveError) {
          log(`Error saving code generation to history: ${saveError}`, "api");
          // Continue even if saving fails
        }
      }
      
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
    
    // Cache key for this endpoint
    const cacheKey = `samples:${language.toLowerCase()}`;
    
    // Check cache first
    const cachedSample = cache.get<string>(cacheKey);
    if (cachedSample) {
      logger.debug(`Cache hit for sample code: ${language}`, 'api:samples');
      return res.json({ sample: cachedSample });
    }
    
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
      logger.info(`No sample available for language: ${language}`, 'api:samples');
      return res.status(404).json({ message: `No sample available for ${language}` });
    }
    
    // Cache the sample for future requests (24 hours, since samples don't change)
    cache.set(cacheKey, sample, 86400);
    
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
        logger.warn('Invalid repository analysis request data', 'api:analyze:github', parseResult.error.format());
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: parseResult.error.format() 
        });
      }
      
      const { repositoryUrl, repositoryName } = parseResult.data;
      
      if (!repositoryUrl) {
        logger.warn('Repository URL missing in request', 'api:analyze:github');
        return res.status(400).json({ 
          message: "Repository URL is required" 
        });
      }
      
      // Normalize the repository URL to ensure consistent caching
      const normalizedRepoUrl = repositoryUrl.trim().replace(/\/+$/, '').replace(/\.git$/, '');
      
      // Generate a cache key based on the repository URL
      const cacheKey = `analysis:github:${Buffer.from(normalizedRepoUrl).toString('base64')}`;
      
      // Check if we have a cached analysis for this repository
      const cachedAnalysis = cache.get(cacheKey);
      if (cachedAnalysis) {
        logger.info(`Returning cached analysis for ${normalizedRepoUrl}`, 'api:analyze:github');
        return res.json(cachedAnalysis);
      }
      
      // Set GitHub token if available
      if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        githubAPI.setToken(token);
      } else if (req.isAuthenticated() && (req.user as any).githubAccessToken) {
        githubAPI.setToken((req.user as any).githubAccessToken);
      }
      
      logger.info(`Fetching repository files from ${normalizedRepoUrl}`, 'api:analyze:github');
      // Fetch files from the GitHub repository
      const files = await githubAPI.fetchRepositoryFilesFromUrl(normalizedRepoUrl);
      
      // Check if we have any files to analyze
      if (Object.keys(files).length === 0) {
        logger.warn(`No analyzable files found for ${normalizedRepoUrl}`, 'api:analyze:github');
        return res.status(400).json({
          message: "No analyzable files found",
          details: "The repository did not contain any code files that could be analyzed"
        });
      }
      
      // Analyze the repository using OpenAI
      const actualRepoName = repositoryName || normalizedRepoUrl.split('/').pop() || 'Repository';
      
      logger.info(`Starting OpenAI analysis for repository: ${actualRepoName}`, 'api:analyze:github');
      const startTime = Date.now();
      const analysis = await openaiAPI.analyzeRepository(files, actualRepoName);
      const duration = Date.now() - startTime;
      logger.info(`Completed OpenAI analysis in ${duration}ms`, 'api:analyze:github');
      
      // Store analysis in database with user association if authenticated
      const userId = req.isAuthenticated() ? (req.user as any).id : null;
      
      const savedAnalysis = await storage.saveRepositoryAnalysis({
        repositoryName: actualRepoName,
        repositoryUrl: normalizedRepoUrl,
        technicalAnalysis: analysis.technicalAnalysis,
        userManual: analysis.userManual,
        analysisSummary: analysis.analysisSummary,
        analyzedFiles: analysis.analyzedFiles,
        totalFiles: analysis.totalFiles,
        metadata: null,
        userId
      });
      
      // Prepare the response data
      const responseData = {
        id: savedAnalysis.id,
        repositoryName: savedAnalysis.repositoryName,
        repositoryUrl: savedAnalysis.repositoryUrl,
        technicalAnalysis: savedAnalysis.technicalAnalysis,
        userManual: savedAnalysis.userManual,
        analyzedFiles: savedAnalysis.analyzedFiles,
        totalFiles: savedAnalysis.totalFiles,
        analysisSummary: savedAnalysis.analysisSummary
      };
      
      // Cache the analysis result (1 hour TTL - since this is a very expensive operation)
      cache.set(cacheKey, responseData, 3600);
      
      // Return the analysis results
      return res.json(responseData);
    } catch (error) {
      logger.error('Failed to analyze GitHub repository', error as Error, 'api:analyze:github', {
        url: req.body?.repositoryUrl
      });
      
      // More specific error handling
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes('rate limit') || errorMessage.includes('403')) {
        return res.status(429).json({
          message: "GitHub API rate limit exceeded. Please try again later.",
          details: errorMessage
        });
      }
      
      return res.status(500).json({
        message: "Failed to analyze GitHub repository",
        details: errorMessage
      });
    }
  });
  
  // Get analysis history
  app.get("/api/analyses", async (req, res) => {
    try {
      const userId = req.isAuthenticated() ? (req.user as any).id : null;
      const cacheKey = userId ? `analyses:user:${userId}` : 'analyses:latest';
      
      // Try to get analyses from cache first (TTL: 5 minutes)
      const cachedAnalyses = cache.get(cacheKey);
      if (cachedAnalyses) {
        logger.debug(`Cache hit for analyses list: ${cacheKey}`, 'api:analyses');
        return res.json(cachedAnalyses);
      }
      
      logger.debug(`Cache miss for analyses list, fetching from database`, 'api:analyses');
      
      // Fetch analyses based on authentication status
      let analyses;
      if (userId) {
        analyses = await storage.getRepositoryAnalysesByUser(userId);
      } else {
        analyses = await storage.getLatestRepositoryAnalyses(10);
      }
      
      // Map to simplified response format
      const response = analyses.map(analysis => ({
        id: analysis.id,
        repositoryName: analysis.repositoryName,
        repositoryUrl: analysis.repositoryUrl,
        createdAt: analysis.createdAt,
        analyzedFiles: analysis.analyzedFiles,
        totalFiles: analysis.totalFiles,
      }));
      
      // Cache the result (5 minutes TTL)
      cache.set(cacheKey, response, 300);
      
      return res.json(response);
    } catch (error) {
      logger.error('Failed to fetch analysis history', error as Error, 'api:analyses');
      return res.status(500).json({
        message: "Failed to fetch analysis history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get user's GitHub repositories
  app.get("/api/github/repositories", ensureAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      
      if (!user.githubAccessToken) {
        logger.warn(`GitHub access token not available for user: ${userId}`, 'api:github');
        return res.status(400).json({ 
          message: "GitHub access token not available. Please reconnect your GitHub account."
        });
      }
      
      // Cache key for this user's repositories
      const cacheKey = `github:repos:user:${userId}`;
      
      // Try to get from cache first (TTL: 10 minutes)
      // Using shorter TTL since GitHub repos can be updated more frequently
      const cachedRepos = cache.get(cacheKey);
      if (cachedRepos) {
        logger.debug(`Cache hit for GitHub repositories: user ${userId}`, 'api:github');
        return res.json(cachedRepos);
      }
      
      logger.info(`Fetching GitHub repositories for user: ${userId}`, 'api:github');
      githubAPI.setToken(user.githubAccessToken);
      const repositories = await githubAPI.getRepositories();
      
      // Cache the repositories (10 minute TTL)
      cache.set(cacheKey, repositories, 600);
      
      return res.json(repositories);
    } catch (error) {
      logger.error('Failed to fetch GitHub repositories', error as Error, 'api:github');
      
      // Handle GitHub API rate limiting specifically
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes('rate limit') || errorMessage.includes('403')) {
        return res.status(429).json({
          message: "GitHub API rate limit exceeded. Please try again later.",
          details: errorMessage
        });
      }
      
      return res.status(500).json({
        message: "Failed to fetch GitHub repositories",
        details: errorMessage
      });
    }
  });
  
  // Get explanation history for the current user
  app.get("/api/history", async (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = (req.user as any)?.id;
      
      // Extra validation to avoid server crashes in production
      if (!userId) {
        logger.warn('User authenticated but no ID found in session', 'api:history', { user: req.user });
        return res.status(200).json([]);  // Return empty array instead of error
      }
      
      // Cache key for this user's history
      const cacheKey = `explanations:user:${userId}`;
      
      // Try to get from cache first (TTL: 5 minutes)
      const cachedHistory = cache.get(cacheKey);
      if (cachedHistory) {
        logger.debug(`Cache hit for user history: ${userId}`, 'api:history');
        return res.json(cachedHistory);
      }
      
      try {
        logger.debug(`Fetching explanation history for user: ${userId}`, 'api:history');
        const explanations = await storage.getExplanationsByUser(userId, 10);
        
        // Validate we have actual explanations before trying to process them
        if (!explanations || !Array.isArray(explanations)) {
          logger.warn('Empty or invalid explanations returned', 'api:history', { userId });
          return res.status(200).json([]);
        }
        
        // Check if 'type' field exists in the schema
        const hasTypeField = explanations.length > 0 && 'type' in explanations[0];
        
        // Format the response with extra validation
        const response = explanations.map(explanation => {
          if (!explanation) return null;
          
          return {
            id: explanation.id,
            title: explanation.title || 'Untitled',
            language: explanation.language || 'unknown',
            // Only include type if the field exists
            ...(hasTypeField && { type: (explanation as any).type }),
            createdAt: explanation.createdAt || new Date(),
            // Don't include the full code and explanation to keep the response smaller
            codePreview: explanation.code ? 
              (explanation.code.substring(0, 100) + (explanation.code.length > 100 ? '...' : '')) : 
              'No code available'
          };
        }).filter(item => item !== null); // Remove any null items
        
        // Cache the history (5 minute TTL)
        cache.set(cacheKey, response, 300);
        
        return res.json(response);
      } catch (dbError) {
        // Handle database errors gracefully - don't crash the request
        logger.error('Database error while fetching explanations', dbError as Error, 'api:history:db');
        return res.status(200).json([]); // Return empty array instead of error
      }
    } catch (error) {
      logger.error('Failed to fetch explanation history', error as Error, 'api:history');
      // In production, don't expose error details to client
      return res.status(200).json([]);  // Return empty array instead of 500 error
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
