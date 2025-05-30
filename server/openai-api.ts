import OpenAI from "openai";
import { log } from "./vite";
import fs from "fs";
import path from "path";
import { ExplanationSettings, RepositoryAnalysisResponse } from "@shared/schema";

// Using gpt-4o-mini to avoid rate limiting issues while maintaining good performance
const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIAPI {
  private client: OpenAI;
  
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      log("Warning: No OpenAI API key provided", "openai");
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Explain code using OpenAI
   * @param code The code to explain
   * @param language The programming language (or 'auto' for auto-detection)
   * @param detailLevel The level of detail for the explanation
   * @returns A promise resolving to the code explanation
   */
  async explainCode(
    code: string,
    language: string,
    detailLevel: "basic" | "standard" | "advanced" = "standard"
  ): Promise<string> {
    try {
      const languagePrompt = language === 'auto' 
        ? "Please detect the programming language and explain the following code:" 
        : `Please explain the following ${language} code:`;

      // Create significantly different instruction sets for each detail level
      let systemPrompt = "";
      let detailInstructions = "";
      let additionalRequirements = "";
      
      if (detailLevel === "basic") {
        systemPrompt = "You are a programming teacher for beginners. Your explanations avoid technical jargon and focus on simple concepts. Use analogies and everyday examples to explain code.";
        
        detailInstructions = `
Explain this in simple terms that a complete beginner would understand. 
- Avoid technical jargon completely.
- Use everyday analogies and relatable examples.
- Don't assume any prior programming knowledge.
- Focus only on what the code does in plain language.
- Keep the explanation concise and to the point.
- Don't include time/space complexity analysis.
`;
        
        additionalRequirements = `
Your explanation should ONLY include:
1. What the code does in very simple terms
2. A basic explanation of how it works using everyday analogies
3. An example of when this code might be used in real life

Format your explanation using simple language a non-programmer could understand.
`;
      } else if (detailLevel === "advanced") {
        systemPrompt = "You are a senior software engineer conducting a detailed code review. Your explanations are thorough, technical, and cover implementation details, optimizations, and best practices.";
        
        detailInstructions = `
Provide a comprehensive technical analysis of this code:
- Include detailed time and space complexity analysis with Big O notation
- Thoroughly examine edge cases and potential failure points
- Suggest specific optimizations with code examples
- Evaluate the code against industry best practices
- Highlight any potential security vulnerabilities or performance bottlenecks
- Include references to relevant design patterns or algorithms
`;
        
        additionalRequirements = `
Your advanced analysis MUST include all of these sections:
1. High-level overview of the code's purpose
2. Detailed algorithmic analysis with time/space complexity
3. Comprehensive edge case examination
4. Code quality assessment
5. Specific refactoring suggestions with code examples
6. Performance optimization opportunities
7. Technical debt identification

Format your explanation with clear section headers and technical details.
`;
      } else {
        systemPrompt = "You are a helpful assistant that explains code in plain English for intermediate programmers. Your explanations balance technical accuracy with clear explanations.";
        
        detailInstructions = "Provide a balanced explanation with enough technical details for intermediate programmers. Include both conceptual understanding and some implementation details.";
        
        additionalRequirements = `
Your explanation should include:
1. What the code does
2. How it works step by step
3. Any important patterns or techniques used
4. Basic time and space complexity considerations
5. Common edge cases or limitations
6. Possible improvements

Format your explanation using Markdown with clear sections.
`;
      }

      const response = await this.client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `
${languagePrompt}

\`\`\`${language !== 'auto' ? language : ''}
${code}
\`\`\`

${detailInstructions}

${additionalRequirements}
`
          }
        ],
        temperature: detailLevel === "basic" ? 0.7 : 0.3, // Higher temperature for more creative basic explanations
      });

      return response.choices[0].message.content || "No explanation generated.";
    } catch (error) {
      log(`Error explaining code: ${error}`, "openai");
      throw error;
    }
  }

  /**
   * Generate code from a text description
   * @param description The natural language description
   * @param language The target programming language
   * @returns A promise resolving to the generated code
   */
  async generateCode(description: string, language: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a skilled programmer who writes clean, efficient and well-documented code."
          },
          {
            role: "user",
            content: `
Please write ${language} code based on this description:

Description: ${description}

Write clean, efficient, and well-commented ${language} code that implements this functionality. 
The code should be production-ready and follow best practices for ${language}.

Format your response with just the code in a code block.
`
          }
        ],
        temperature: 0.2,
      });

      const content = response.choices[0].message.content || "";
      
      // Extract code from markdown code blocks if present
      const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?([\\s\\S]*?)\`\`\``, "i");
      const match = content.match(codeBlockRegex);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      // Return the full content if no code block is found
      return content;
    } catch (error) {
      log(`Error generating code: ${error}`, "openai");
      throw error;
    }
  }
  
  /**
   * Analyzes a repository's code to generate a report
   * @param files Object mapping file paths to file contents
   * @param repoName Name of the repository (for reference in the report)
   * @returns Promise resolving to repository analysis
   */
  async analyzeRepository(
    files: Record<string, string>,
    repoName: string
  ): Promise<RepositoryAnalysisResponse> {
    try {
      // Create a summary of the repository structure
      const fileList = Object.keys(files).sort();
      const repoStructure = this.createRepoStructure(fileList);
      
      // Choose a sample of representative files to analyze
      const selectedFiles = this.selectRepresentativeFiles(files);
      
      // Create a prompt that includes repository structure and selected files
      const prompt = this.createRepoAnalysisPrompt(repoName, repoStructure, selectedFiles);
      
      const response = await this.client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert software developer tasked with analyzing a codebase and explaining it clearly. Provide detailed, actionable information about the repository structure, its primary features, and how to use the application.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });
      
      const analysis = response.choices[0].message.content || "";
      
      // Generate a user manual as a separate step
      const manualPrompt = this.createUserManualPrompt(repoName, repoStructure, analysis);
      
      const manualResponse = await this.client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a technical writer creating clear, comprehensive user documentation. Create a user manual that explains how to use the application, its features, and common workflows.",
          },
          {
            role: "user",
            content: manualPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });
      
      const userManual = manualResponse.choices[0].message.content || "";
      
      return {
        repositoryName: repoName,
        technicalAnalysis: analysis,
        userManual: userManual,
        analyzedFiles: Object.keys(selectedFiles).length,
        totalFiles: Object.keys(files).length,
      };
    } catch (error) {
      log(`Error analyzing repository: ${error}`, "openai");
      throw error;
    }
  }
  
  /**
   * Creates a hierarchical representation of repository structure
   */
  private createRepoStructure(filePaths: string[]): string {
    // Organize files into a directory structure
    const structure: Record<string, any> = {};
    
    filePaths.forEach(filePath => {
      const parts = filePath.split('/');
      let current = structure;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // It's a file
          current[part] = true;
        } else {
          // It's a directory
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    });
    
    // Convert structure to string representation
    const stringifyStructure = (obj: Record<string, any>, indent = 0): string => {
      let result = '';
      const spacing = '  '.repeat(indent);
      
      Object.keys(obj).forEach(key => {
        if (obj[key] === true) {
          // It's a file
          result += `${spacing}- ${key}\n`;
        } else {
          // It's a directory
          result += `${spacing}+ ${key}/\n`;
          result += stringifyStructure(obj[key], indent + 1);
        }
      });
      
      return result;
    };
    
    return stringifyStructure(structure);
  }
  
  /**
   * Selects representative files from the repository to provide to the AI
   * Prioritizes readme files, configuration, main entry points and selected samples
   */
  private selectRepresentativeFiles(files: Record<string, string>): Record<string, string> {
    const selectedFiles: Record<string, string> = {};
    const filePaths = Object.keys(files);
    
    // Define file categories and their importance
    const priorityPatterns = [
      /readme\.md/i,                                 // README files
      /package\.json|composer\.json|pyproject\.toml/i, // Project config files
      /(^|\/)(app|index|main)\.(js|ts|py|java|rb)$/i, // Main entry points
      /\.env\.example/i,                             // Environment examples
      /docker-compose\.yml|dockerfile/i,             // Docker config
      /schema\.(sql|js|ts|prisma)/i,                 // Database schemas
      /models\/|entities\/|dto\//i,                  // Data models
      /controllers\/|routes\/|api\//i,               // API endpoints
      /components\/|views\//i,                       // UI components
      /utils\/|helpers\//i,                          // Utility code
      /tests\/|spec\//i,                             // Test files
    ];
    
    // First pass: select high priority files
    priorityPatterns.forEach(pattern => {
      filePaths.forEach(filePath => {
        if (pattern.test(filePath) && !selectedFiles[filePath]) {
          selectedFiles[filePath] = files[filePath];
        }
      });
    });
    
    // Second pass: if we have too few files, select additional ones up to a limit
    const MAX_SELECTED_FILES = 15;
    
    if (Object.keys(selectedFiles).length < MAX_SELECTED_FILES) {
      // Add some random sampling from different directories
      const remainingFiles = filePaths.filter(path => !selectedFiles[path]);
      
      // Group by directories
      const filesByDir = remainingFiles.reduce((acc, filePath) => {
        const dir = path.dirname(filePath);
        if (!acc[dir]) acc[dir] = [];
        acc[dir].push(filePath);
        return acc;
      }, {} as Record<string, string[]>);
      
      // Take one file from each directory until we reach the max
      const dirs = Object.keys(filesByDir);
      
      for (const dir of dirs) {
        if (Object.keys(selectedFiles).length >= MAX_SELECTED_FILES) break;
        
        if (filesByDir[dir].length > 0) {
          const filePath = filesByDir[dir][0];
          selectedFiles[filePath] = files[filePath];
          filesByDir[dir].shift();
        }
      }
    }
    
    // Ensure we don't exceed token limits by truncating large files
    const MAX_CHARS_PER_FILE = 10000;
    
    for (const filePath in selectedFiles) {
      if (selectedFiles[filePath].length > MAX_CHARS_PER_FILE) {
        selectedFiles[filePath] = 
          selectedFiles[filePath].substring(0, MAX_CHARS_PER_FILE) + 
          "\n... [file truncated due to size]";
      }
    }
    
    return selectedFiles;
  }
  
  /**
   * Creates a prompt for repository analysis
   */
  private createRepoAnalysisPrompt(
    repoName: string,
    repoStructure: string,
    selectedFiles: Record<string, string>
  ): string {
    return `
I need you to analyze a codebase for the repository "${repoName}". 
Here's the repository structure:

\`\`\`
${repoStructure}
\`\`\`

I'm providing the contents of key files to help with the analysis. 
Please analyze these files and the repository structure to:

1. Identify what type of application this is (web app, mobile app, API, etc.)
2. Determine the primary programming languages and frameworks used
3. Describe the main features and functionality
4. Explain the architecture and key components
5. Note any important configuration or deployment requirements

Here are the selected files:

${Object.entries(selectedFiles).map(([filePath, content]) => (
  `--- ${filePath} ---
\`\`\`
${content}
\`\`\`
`)).join('\n\n')}

Please provide a comprehensive technical analysis of this codebase.
`;
  }
  
  /**
   * Creates a prompt for generating a user manual
   */
  private createUserManualPrompt(
    repoName: string,
    repoStructure: string,
    analysis: string
  ): string {
    return `
Based on this technical analysis of the repository "${repoName}":

${analysis}

Please create a comprehensive user manual that includes:

1. Installation and setup instructions
2. A quickstart guide for first-time users
3. Detailed explanations of all features and how to use them
4. Common use cases and workflows
5. Troubleshooting tips for common issues

The manual should be well-structured with clear headings and be written in a way that's accessible to users who may not be technical experts.
Use markdown formatting to create a professional-looking document.
`;
  }
}

export const openaiAPI = new OpenAIAPI();