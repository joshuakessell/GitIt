import fetch from "node-fetch";
import { log } from "./vite";

interface HuggingFaceOptions {
  model: string;
  apiKey?: string;
}

export class HuggingFaceAPI {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api-inference.huggingface.co/models";

  constructor(options: HuggingFaceOptions) {
    this.apiKey = options.apiKey || process.env.HUGGINGFACE_API_KEY || "";
    this.model = options.model;

    if (!this.apiKey) {
      log("Warning: No Hugging Face API key provided", "huggingface");
    }
  }

  /**
   * Explain code using Hugging Face model
   * @param code The code to explain
   * @param language The programming language
   * @param detailLevel The level of detail for the explanation
   * @returns A promise resolving to the code explanation
   */
  async explainCode(
    code: string,
    language: string,
    detailLevel: "basic" | "standard" | "advanced" = "standard"
  ): Promise<string> {
    const prompt = this.createCodeExplanationPrompt(code, language, detailLevel);
    
    try {
      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.3,
            top_p: 0.95,
            do_sample: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log(`Hugging Face API error: ${response.status} - ${errorText}`, "huggingface");
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
        // Extract the explanation part from the generated text (exclude the prompt)
        const generatedText = result[0].generated_text as string;
        return this.extractExplanation(generatedText, prompt);
      } else {
        // Handle cases where the response format might be different
        return typeof result === "string" 
          ? result 
          : JSON.stringify(result);
      }
    } catch (error) {
      log(`Error explaining code: ${error}`, "huggingface");
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
    const prompt = this.createCodeGenerationPrompt(description, language);
    
    try {
      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.2,
            top_p: 0.95,
            do_sample: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log(`Hugging Face API error: ${response.status} - ${errorText}`, "huggingface");
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
        // Extract the code part from the generated text
        const generatedText = result[0].generated_text as string;
        return this.extractCode(generatedText, prompt, language);
      } else {
        // Handle cases where the response format might be different
        return typeof result === "string" 
          ? result 
          : JSON.stringify(result);
      }
    } catch (error) {
      log(`Error generating code: ${error}`, "huggingface");
      throw error;
    }
  }

  private createCodeExplanationPrompt(
    code: string, 
    language: string, 
    detailLevel: "basic" | "standard" | "advanced"
  ): string {
    let detailInstructions = "";
    
    if (detailLevel === "basic") {
      detailInstructions = "Explain this in simple terms that a beginner would understand. Avoid technical jargon.";
    } else if (detailLevel === "advanced") {
      detailInstructions = "Provide a detailed technical explanation including time/space complexity analysis, edge cases, and potential optimizations.";
    } else {
      detailInstructions = "Provide a balanced explanation with enough technical details for intermediate programmers.";
    }

    return `
You are a helpful assistant that explains code in plain English. Please explain the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

${detailInstructions}

Your explanation should include:
1. What the code does
2. How it works step by step
3. Any important patterns or techniques used
4. Time and space complexity analysis
5. Potential edge cases or limitations
6. Possible improvements

Format your explanation using Markdown.
`;
  }

  private createCodeGenerationPrompt(description: string, language: string): string {
    return `
You are a helpful assistant that generates code based on natural language descriptions. Please write ${language} code based on this description:

Description: ${description}

Write clean, efficient, and well-commented ${language} code that implements this functionality. 
The code should be production-ready and follow best practices for ${language}.
`;
  }

  private extractExplanation(generatedText: string, prompt: string): string {
    // Simple approach: remove the prompt part from the generated text
    const explanation = generatedText.replace(prompt, "").trim();
    return explanation;
  }

  private extractCode(generatedText: string, prompt: string, language: string): string {
    // Try to extract code between code blocks
    const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?([\\s\\S]*?)\`\`\``, "i");
    const match = generatedText.match(codeBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback: return the full text without the prompt
    return generatedText.replace(prompt, "").trim();
  }
}

// Create a singleton instance with a reasonable default model
export const huggingFaceAPI = new HuggingFaceAPI({
  model: process.env.HUGGINGFACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.2", // Can be replaced with better code-specialized models
});
