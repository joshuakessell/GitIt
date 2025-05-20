import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertExplanation = z.infer<typeof insertExplanationSchema>;
export type Explanation = typeof explanations.$inferSelect;

export type ExplanationSettings = z.infer<typeof explanationSettingsSchema>;
export type CodeToTextRequest = z.infer<typeof codeToTextRequestSchema>;
export type TextToCodeRequest = z.infer<typeof textToCodeRequestSchema>;
