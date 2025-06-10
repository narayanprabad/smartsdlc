import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // 'ba', 'pm', 'developer', 'devops', 'uat', 'stakeholder'
  profile: text("profile"), // e.g., 'Global Clearing BA', 'PFT BA'
  groups: text("groups").array().default([]), // user groups/teams
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'on-hold'
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url"), // for URL-based documents
  projectId: integer("project_id").references(() => projects.id),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  processingStatus: text("processing_status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  processingProgress: integer("processing_progress").default(0),
  extractedContent: text("extracted_content"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const useCases = pgTable("use_cases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  actors: text("actors").array().default([]),
  dependencies: text("dependencies").array().default([]),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'critical'
  status: text("status").default("draft"), // 'draft', 'pending_review', 'approved', 'assigned', 'in_development', 'completed'
  sourceDocumentId: integer("source_document_id").references(() => documents.id),
  projectId: integer("project_id").references(() => projects.id),
  createdBy: integer("created_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  assignedGroup: text("assigned_group"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'use_case', 'architecture', 'development', 'testing'
  entityId: integer("entity_id").notNull(), // references the specific entity (use case, etc.)
  fromUserId: integer("from_user_id").references(() => users.id),
  toUserId: integer("to_user_id").references(() => users.id),
  toGroup: text("to_group"),
  status: text("status").default("pending"), // 'pending', 'accepted', 'completed', 'rejected'
  comments: text("comments"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"), // 'project', 'document', 'use_case', 'assignment'
  entityId: integer("entity_id"),
  details: text("details"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'cluster_use_cases', 'missing_info', 'architecture_pattern'
  entityId: integer("entity_id"),
  suggestion: text("suggestion").notNull(),
  confidence: integer("confidence").default(0), // 0-100
  status: text("status").default("pending"), // 'pending', 'accepted', 'dismissed'
  userId: integer("user_id").references(() => users.id),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(), // Full requirements specification
  sourceUrl: text("source_url"), // Original URL analyzed
  status: text("status").default("draft"), // 'draft', 'review', 'accepted', 'implemented'
  version: integer("version").default(1),
  projectId: integer("project_id").references(() => projects.id),
  createdBy: integer("created_by").references(() => users.id),
  acceptedBy: integer("accepted_by").references(() => users.id),
  assignedPm: integer("assigned_pm").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliverables = pgTable("deliverables", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id").references(() => requirements.id),
  useCaseId: integer("use_case_id").references(() => useCases.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'epic', 'story', 'task', 'bug'
  jiraKey: text("jira_key"), // Generated Jira ticket key
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'critical'
  storyPoints: integer("story_points"),
  assigneeId: integer("assignee_id").references(() => users.id),
  status: text("status").default("todo"), // 'todo', 'in_progress', 'review', 'done'
  acceptanceCriteria: text("acceptance_criteria").array().default([]),
  dependencies: text("dependencies").array().default([]),
  labels: text("labels").array().default([]),
  metadata: jsonb("metadata").default({}),
  dueDate: timestamp("due_date"),
  estimatedHours: integer("estimated_hours"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id").references(() => requirements.id),
  reviewerId: integer("reviewer_id").references(() => users.id),
  rating: integer("rating"), // 1-5 stars
  comments: text("comments"),
  suggestions: text("suggestions").array().default([]),
  status: text("status").default("pending"), // 'pending', 'completed'
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewComments = pgTable("review_comments", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").references(() => reviews.id),
  userId: integer("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  isEditable: boolean("is_editable").default(true),
  parentCommentId: integer("parent_comment_id"), // For threaded comments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const architectureDesigns = pgTable("architecture_designs", {
  id: serial("id").primaryKey(),
  useCaseId: integer("use_case_id").references(() => useCases.id),
  systemOverview: text("system_overview").notNull(),
  architecturalPattern: text("architectural_pattern").notNull(),
  components: text("components").notNull(),
  dataFlow: text("data_flow").notNull(),
  securityConsiderations: text("security_considerations").notNull(),
  scalabilityStrategy: text("scalability_strategy").notNull(),
  technologyStack: text("technology_stack").notNull(),
  integrationPoints: text("integration_points"),
  performanceRequirements: text("performance_requirements"),
  estimatedComplexity: text("estimated_complexity").default("medium"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const uiAllocations = pgTable("ui_allocations", {
  id: serial("id").primaryKey(),
  useCaseId: integer("use_case_id").references(() => useCases.id),
  designerId: integer("designer_id").references(() => users.id),
  uiComplexity: text("ui_complexity").notNull(),
  designScope: text("design_scope").array().default([]),
  estimatedDesignHours: integer("estimated_design_hours").notNull(),
  designDeadline: timestamp("design_deadline").notNull(),
  designRequirements: text("design_requirements").notNull(),
  platformTargets: text("platform_targets").array().default([]),
  designAssets: text("design_assets"),
  brandingGuidelines: text("branding_guidelines"),
  userPersonas: text("user_personas"),
  status: text("status").default("assigned"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").default("planning"),
  velocity: integer("velocity"),
  useCaseIds: text("use_case_ids").array().default([]),
  scrumMasterId: integer("scrum_master_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
  profile: true,
  groups: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  status: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  url: true,
  projectId: true,
});

export const insertUseCaseSchema = createInsertSchema(useCases).pick({
  title: true,
  description: true,
  actors: true,
  dependencies: true,
  priority: true,
  projectId: true,
  sourceDocumentId: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).pick({
  type: true,
  entityId: true,
  toUserId: true,
  toGroup: true,
  comments: true,
  dueDate: true,
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  action: true,
  entityType: true,
  entityId: true,
  details: true,
  metadata: true,
});

export const insertAISuggestionSchema = createInsertSchema(aiSuggestions).pick({
  type: true,
  entityId: true,
  suggestion: true,
  confidence: true,
  metadata: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).pick({
  title: true,
  content: true,
  sourceUrl: true,
  projectId: true,
  metadata: true,
});

export const insertDeliverableSchema = createInsertSchema(deliverables).pick({
  requirementId: true,
  useCaseId: true,
  title: true,
  description: true,
  type: true,
  priority: true,
  storyPoints: true,
  assigneeId: true,
  status: true,
  acceptanceCriteria: true,
  dependencies: true,
  labels: true,
  metadata: true,
  dueDate: true,
  estimatedHours: true,
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  requirementId: true,
  rating: true,
  comments: true,
  suggestions: true,
});

export const insertReviewCommentSchema = createInsertSchema(reviewComments).pick({
  reviewId: true,
  comment: true,
  parentCommentId: true,
});

export const insertArchitectureDesignSchema = createInsertSchema(architectureDesigns).pick({
  useCaseId: true,
  systemOverview: true,
  architecturalPattern: true,
  components: true,
  dataFlow: true,
  securityConsiderations: true,
  scalabilityStrategy: true,
  technologyStack: true,
  integrationPoints: true,
  performanceRequirements: true,
  estimatedComplexity: true,
});

export const insertUIAllocationSchema = createInsertSchema(uiAllocations).pick({
  useCaseId: true,
  designerId: true,
  uiComplexity: true,
  designScope: true,
  estimatedDesignHours: true,
  designDeadline: true,
  designRequirements: true,
  platformTargets: true,
  designAssets: true,
  brandingGuidelines: true,
  userPersonas: true,
});

export const insertSprintSchema = createInsertSchema(sprints).pick({
  name: true,
  goal: true,
  startDate: true,
  endDate: true,
  velocity: true,
  useCaseIds: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UseCase = typeof useCases.$inferSelect;
export type InsertUseCase = z.infer<typeof insertUseCaseSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type AISuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAISuggestion = z.infer<typeof insertAISuggestionSchema>;
export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type Deliverable = typeof deliverables.$inferSelect;
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type ReviewComment = typeof reviewComments.$inferSelect;
export type InsertReviewComment = z.infer<typeof insertReviewCommentSchema>;
export type ArchitectureDesign = typeof architectureDesigns.$inferSelect;
export type InsertArchitectureDesign = z.infer<typeof insertArchitectureDesignSchema>;
export type UIAllocation = typeof uiAllocations.$inferSelect;
export type InsertUIAllocation = z.infer<typeof insertUIAllocationSchema>;
export type Sprint = typeof sprints.$inferSelect;
export type InsertSprint = z.infer<typeof insertSprintSchema>;
