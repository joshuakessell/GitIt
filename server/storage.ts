import { 
  users, 
  repositoryAnalyses,
  explanations,
  type User, 
  type InsertUser,
  type RepositoryAnalysis,
  type InsertRepositoryAnalysis,
  type Explanation,
  type InsertExplanation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Repository analysis operations
  saveRepositoryAnalysis(analysis: InsertRepositoryAnalysis): Promise<RepositoryAnalysis>;
  getRepositoryAnalysis(id: number): Promise<RepositoryAnalysis | undefined>;
  getRepositoryAnalysesByUser(userId: number): Promise<RepositoryAnalysis[]>;
  getLatestRepositoryAnalyses(limit?: number): Promise<RepositoryAnalysis[]>;
  
  // Explanation history operations
  saveExplanation(explanation: InsertExplanation): Promise<Explanation>;
  getExplanationsByUser(userId: number, limit?: number): Promise<Explanation[]>;
  getLatestExplanations(limit?: number): Promise<Explanation[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        githubId: insertUser.githubId || null,
        githubUsername: insertUser.githubUsername || null,
        githubAccessToken: insertUser.githubAccessToken || null
      })
      .returning();
    return user;
  }
  
  // Explanation history operations
  async saveExplanation(explanation: InsertExplanation): Promise<Explanation> {
    const [saved] = await db
      .insert(explanations)
      .values(explanation)
      .returning();
    return saved;
  }
  
  async getExplanationsByUser(userId: number, limit: number = 10): Promise<Explanation[]> {
    return await db
      .select()
      .from(explanations)
      .where(eq(explanations.userId, userId))
      .orderBy(desc(explanations.createdAt))
      .limit(limit);
  }
  
  async getLatestExplanations(limit: number = 10): Promise<Explanation[]> {
    return await db
      .select()
      .from(explanations)
      .orderBy(desc(explanations.createdAt))
      .limit(limit);
  }
  
  // Repository analysis operations
  async saveRepositoryAnalysis(analysis: InsertRepositoryAnalysis): Promise<RepositoryAnalysis> {
    const [savedAnalysis] = await db
      .insert(repositoryAnalyses)
      .values(analysis)
      .returning();
    return savedAnalysis;
  }
  
  async getRepositoryAnalysis(id: number): Promise<RepositoryAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(repositoryAnalyses)
      .where(eq(repositoryAnalyses.id, id));
    return analysis;
  }
  
  async getRepositoryAnalysesByUser(userId: number): Promise<RepositoryAnalysis[]> {
    return db
      .select()
      .from(repositoryAnalyses)
      .where(eq(repositoryAnalyses.userId, userId))
      .orderBy(desc(repositoryAnalyses.createdAt));
  }
  
  async getLatestRepositoryAnalyses(limit: number = 10): Promise<RepositoryAnalysis[]> {
    return db
      .select()
      .from(repositoryAnalyses)
      .limit(limit)
      .orderBy(desc(repositoryAnalyses.createdAt));
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private repositoryAnalyses: Map<number, RepositoryAnalysis>;
  private explanationHistory: Map<number, Explanation>;
  private userIdCounter: number;
  private repoAnalysisIdCounter: number;
  private explanationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.repositoryAnalyses = new Map();
    this.explanationHistory = new Map();
    this.userIdCounter = 1;
    this.repoAnalysisIdCounter = 1;
    this.explanationIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user = { 
      ...insertUser, 
      id,
      githubId: insertUser.githubId || null,
      githubUsername: insertUser.githubUsername || null,
      githubAccessToken: insertUser.githubAccessToken || null
    };
    this.users.set(id, user);
    return user;
  }
  
  // Repository analysis operations
  async saveRepositoryAnalysis(analysis: InsertRepositoryAnalysis): Promise<RepositoryAnalysis> {
    const id = this.repoAnalysisIdCounter++;
    const now = new Date();
    const savedAnalysis: RepositoryAnalysis = {
      ...analysis,
      id,
      createdAt: now,
    };
    this.repositoryAnalyses.set(id, savedAnalysis);
    return savedAnalysis;
  }
  
  async getRepositoryAnalysis(id: number): Promise<RepositoryAnalysis | undefined> {
    return this.repositoryAnalyses.get(id);
  }
  
  async getRepositoryAnalysesByUser(userId: number): Promise<RepositoryAnalysis[]> {
    return Array.from(this.repositoryAnalyses.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getLatestRepositoryAnalyses(limit: number = 10): Promise<RepositoryAnalysis[]> {
    return Array.from(this.repositoryAnalyses.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  // Explanation history operations
  async saveExplanation(explanation: InsertExplanation): Promise<Explanation> {
    const id = this.explanationIdCounter++;
    const now = new Date();
    
    const savedExplanation: Explanation = {
      id,
      userId: explanation.userId || null,
      title: explanation.title || "Code explanation",
      code: explanation.code,
      explanation: explanation.explanation,
      language: explanation.language,
      type: explanation.type,
      createdAt: now
    };
    
    this.explanationHistory.set(id, savedExplanation);
    return savedExplanation;
  }
  
  async getExplanationsByUser(userId: number, limit: number = 10): Promise<Explanation[]> {
    return Array.from(this.explanationHistory.values())
      .filter(explanation => explanation.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  async getLatestExplanations(limit: number = 10): Promise<Explanation[]> {
    return Array.from(this.explanationHistory.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

// Use database storage if we have a DATABASE_URL, otherwise use memory storage
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage()
  : new MemStorage();
