import { 
  users, 
  repositoryAnalyses,
  type User, 
  type InsertUser,
  type RepositoryAnalysis,
  type InsertRepositoryAnalysis,
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
  private userIdCounter: number;
  private repoAnalysisIdCounter: number;

  constructor() {
    this.users = new Map();
    this.repositoryAnalyses = new Map();
    this.userIdCounter = 1;
    this.repoAnalysisIdCounter = 1;
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
}

// Use database storage if we have a DATABASE_URL, otherwise use memory storage
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage()
  : new MemStorage();
