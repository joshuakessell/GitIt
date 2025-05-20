import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { huggingFaceAPI } from "./huggingface-api";
import { 
  codeToTextRequestSchema, 
  textToCodeRequestSchema, 
  explanationSettingsSchema 
} from "@shared/schema";
import { log } from "./vite";

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
      
      const explanation = await huggingFaceAPI.explainCode(
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
      
      const code = await huggingFaceAPI.generateCode(description, language);
      
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

  const httpServer = createServer(app);

  return httpServer;
}
