import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  githubId: text("github_id").unique(),
  githubUsername: text("github_username"),
  githubAccessToken: text("github_access_token"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  githubId: true,
  githubUsername: true,
  githubAccessToken: true,
});

// History of code explanations
export const explanations = pgTable("explanations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  code: text("code").notNull(),
  explanation: text("explanation").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExplanationSchema = createInsertSchema(explanations).pick({
  userId: true,
  title: true,
  code: true,
  explanation: true,
  language: true,
});

// Repository analysis table
export const repositoryAnalyses = pgTable("repository_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  repositoryName: text("repository_name").notNull(),
  repositoryUrl: text("repository_url"),
  technicalAnalysis: text("technical_analysis").notNull(),
  userManual: text("user_manual").notNull(),
  analysisSummary: text("analysis_summary"),
  analyzedFiles: integer("analyzed_files").notNull(),
  totalFiles: integer("total_files").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRepositoryAnalysisSchema = createInsertSchema(repositoryAnalyses).pick({
  userId: true,
  repositoryName: true,
  repositoryUrl: true,
  technicalAnalysis: true,
  userManual: true,
  analysisSummary: true,
  analyzedFiles: true,
  totalFiles: true,
  metadata: true,
});

// Settings for code explanation
export const explanationSettingsSchema = z.object({
  detailLevel: z.enum(["basic", "standard", "advanced"]).default("standard"),
  includeComments: z.boolean().default(true),
  outputFormat: z.enum(["plain", "markdown", "html"]).default("markdown"),
  includeComplexity: z.boolean().default(true),
  includeEdgeCases: z.boolean().default(true),
  includeImprovements: z.boolean().default(true),
});

// Code-to-text explanation request schema
export const codeToTextRequestSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.string().min(1, "Language is required"),
  settings: explanationSettingsSchema.optional(),
});

// Text-to-code generation request schema
export const textToCodeRequestSchema = z.object({
  description: z.string().min(1, "Description is required"),
  language: z.string().min(1, "Language is required"),
});

// Repository analysis request schema
export const repositoryAnalysisRequestSchema = z.object({
  repositoryUrl: z.string().optional(),
  repositoryName: z.string(),
  githubUsername: z.string().optional(),
});

// Repository analysis response
export const repositoryAnalysisResponseSchema = z.object({
  repositoryName: z.string(),
  technicalAnalysis: z.string(),
  userManual: z.string(),
  analyzedFiles: z.number(),
  totalFiles: z.number(),
  analysisSummary: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertExplanation = z.infer<typeof insertExplanationSchema>;
export type Explanation = typeof explanations.$inferSelect;

export type InsertRepositoryAnalysis = z.infer<typeof insertRepositoryAnalysisSchema>;
export type RepositoryAnalysis = typeof repositoryAnalyses.$inferSelect;

export type ExplanationSettings = z.infer<typeof explanationSettingsSchema>;
export type CodeToTextRequest = z.infer<typeof codeToTextRequestSchema>;
export type TextToCodeRequest = z.infer<typeof textToCodeRequestSchema>;
export type RepositoryAnalysisRequest = z.infer<typeof repositoryAnalysisRequestSchema>;
export type RepositoryAnalysisResponse = z.infer<typeof repositoryAnalysisResponseSchema>;
