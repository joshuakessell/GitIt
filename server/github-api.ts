import fetch from 'node-fetch';
import { log } from './vite';

interface GitHubAPIOptions {
  token?: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  owner: {
    login: string;
  };
  default_branch: string;
}

interface GitHubFile {
  name: string;
  path: string;
  type: string;
  content?: string;
  download_url?: string;
}

export class GitHubAPI {
  private baseUrl = 'https://api.github.com';
  private token: string | undefined;
  
  constructor(options: GitHubAPIOptions = {}) {
    this.token = options.token;
  }
  
  /**
   * Set the GitHub access token for authenticated requests
   */
  setToken(token: string) {
    this.token = token;
  }
  
  /**
   * Get the list of repositories for the authenticated user
   */
  async getRepositories(): Promise<GitHubRepo[]> {
    if (!this.token) {
      throw new Error('GitHub token required to fetch repositories');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/user/repos?sort=updated&per_page=100`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - ${await response.text()}`);
      }
      
      return await response.json() as GitHubRepo[];
    } catch (error) {
      log(`Error fetching repositories: ${error}`, "github-api");
      throw error;
    }
  }
  
  /**
   * Get the details for a specific repository
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - ${await response.text()}`);
      }
      
      return await response.json() as GitHubRepo;
    } catch (error) {
      log(`Error fetching repository: ${error}`, "github-api");
      throw error;
    }
  }
  
  /**
   * Get the list of files in a repository recursively
   */
  async listRepositoryContents(owner: string, repo: string, path: string = ''): Promise<GitHubFile[]> {
    try {
      const endpoint = path 
        ? `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`
        : `${this.baseUrl}/repos/${owner}/${repo}/contents`;
        
      const response = await fetch(endpoint, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - ${await response.text()}`);
      }
      
      const contents = await response.json() as GitHubFile[] | GitHubFile;
      
      // If contents is a single file, convert to array
      const files: GitHubFile[] = Array.isArray(contents) ? contents : [contents];
      
      // Process directories recursively
      const result: GitHubFile[] = [];
      
      for (const file of files) {
        if (file.type === 'dir') {
          // Recursively list contents of directory
          const subFiles = await this.listRepositoryContents(owner, repo, file.path);
          result.push(...subFiles);
        } else {
          result.push(file);
        }
      }
      
      return result;
    } catch (error) {
      log(`Error listing repository contents: ${error}`, "github-api");
      throw error;
    }
  }
  
  /**
   * Get file content from GitHub
   */
  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} - ${await response.text()}`);
      }
      
      const data = await response.json() as { content?: string, encoding?: string };
      
      if (data.content && data.encoding === 'base64') {
        // Convert base64 to string
        return Buffer.from(data.content, 'base64').toString('utf-8');
      } else {
        throw new Error('File content or encoding not provided');
      }
    } catch (error) {
      log(`Error getting file content: ${error}`, "github-api");
      throw error;
    }
  }
  
  /**
   * Fetch an entire repository's code files
   * Returns an object mapping file paths to their contents
   */
  async fetchRepositoryFiles(owner: string, repo: string): Promise<Record<string, string>> {
    try {
      // List all files in the repository
      const files = await this.listRepositoryContents(owner, repo);
      
      // Filter files we're interested in
      const filteredFiles = files.filter(file => {
        // Skip binary files, images, large files, etc.
        const binaryExtensions = [
          '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp',
          '.mp4', '.webm', '.ogg', '.mp3', '.wav',
          '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz',
          '.woff', '.woff2', '.eot', '.ttf', 
          '.exe', '.dll', '.so', '.dylib'
        ];
        
        // Check file extension
        if (binaryExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
          return false;
        }
        
        // Skip files in node_modules, .git, etc.
        const skipDirs = ['node_modules/', '.git/', 'dist/', 'build/'];
        if (skipDirs.some(dir => file.path.includes(dir))) {
          return false;
        }
        
        return true;
      });
      
      // Fetch contents of each file
      const result: Record<string, string> = {};
      let fileCounter = 0;
      const MAX_FILES = 100; // Limit number of files to avoid rate limits
      
      for (const file of filteredFiles) {
        if (fileCounter >= MAX_FILES) break;
        
        try {
          const content = await this.getFileContent(owner, repo, file.path);
          
          // Skip very large files
          if (content.length > 500 * 1024) continue; // 500KB max
          
          result[file.path] = content;
          fileCounter++;
        } catch (error) {
          log(`Error fetching file content for ${file.path}: ${error}`, "github-api");
          // Continue with other files
        }
      }
      
      return result;
    } catch (error) {
      log(`Error fetching repository files: ${error}`, "github-api");
      throw error;
    }
  }
  
  /**
   * Get repository details directly from URL
   * Accepts URLs in the format: https://github.com/owner/repo
   */
  async getRepositoryFromUrl(url: string): Promise<GitHubRepo> {
    try {
      // Parse GitHub URL to extract owner and repo
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
      
      if (!match || match.length < 3) {
        throw new Error('Invalid GitHub repository URL');
      }
      
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      
      return await this.getRepository(owner, repo);
    } catch (error) {
      log(`Error fetching repository from URL: ${error}`, "github-api");
      throw error;
    }
  }
  
  /**
   * Fetch repository files directly from URL
   */
  async fetchRepositoryFilesFromUrl(url: string): Promise<Record<string, string>> {
    try {
      // Parse GitHub URL to extract owner and repo
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
      
      if (!match || match.length < 3) {
        throw new Error('Invalid GitHub repository URL');
      }
      
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      
      return await this.fetchRepositoryFiles(owner, repo);
    } catch (error) {
      log(`Error fetching repository files from URL: ${error}`, "github-api");
      throw error;
    }
  }
  
  /**
   * Get headers for GitHub API requests
   */
  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Code-Explainer-App',
    };
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    return headers;
  }
}

// Create singleton instance
export const githubAPI = new GitHubAPI();