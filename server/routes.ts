import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertDocumentSchema, insertUseCaseSchema, insertAssignmentSchema, insertRequirementSchema, insertDeliverableSchema, insertReviewSchema, insertReviewCommentSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import axios from "axios";
import * as cheerio from "cheerio";

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// Session middleware for authentication
const sessions = new Map<string, { userId: number; expires: number }>();

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ message: 'No session token provided' });
  }

  const session = sessions.get(sessionId);
  if (!session || session.expires < Date.now()) {
    sessions.delete(sessionId);
    return res.status(401).json({ message: 'Invalid or expired session' });
  }

  req.userId = session.userId;
  next();
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/zip'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const sessionId = generateSessionId();
      const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      sessions.set(sessionId, { userId: user.id, expires });

      res.json({
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          profile: user.profile,
          groups: user.groups
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', authenticate, async (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: 'Logged out successfully' });
  });

  app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profile: user.profile,
        groups: user.groups
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Users routes
  app.get('/api/users', authenticate, async (req, res) => {
    try {
      const { role } = req.query;
      let users;
      
      if (role) {
        users = await storage.getUsersByRole(role as string);
      } else {
        const allUsers = await storage.getUsersByRole('ba');
        const architects = await storage.getUsersByRole('architect');
        const developers = await storage.getUsersByRole('developer');
        const pms = await storage.getUsersByRole('pm');
        const devops = await storage.getUsersByRole('devops');
        const uat = await storage.getUsersByRole('uat');
        const stakeholders = await storage.getUsersByRole('stakeholder');
        
        users = [...allUsers, ...architects, ...developers, ...pms, ...devops, ...uat, ...stakeholders];
      }

      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profile: user.profile,
        groups: user.groups,
        isActive: user.isActive
      })));
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Projects routes
  app.get('/api/projects', authenticate, async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/projects', authenticate, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...projectData,
        createdBy: req.userId
      });

      await storage.createActivity({
        userId: req.userId,
        action: 'created_project',
        entityType: 'project',
        entityId: project.id,
        details: `Created project: ${project.name}`
      });

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid project data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Documents routes
  app.get('/api/documents', authenticate, async (req, res) => {
    try {
      const { projectId } = req.query;
      let documents;
      
      if (projectId) {
        documents = await storage.getDocumentsByProject(parseInt(projectId as string));
      } else {
        documents = await storage.getDocumentsByUser(req.userId);
      }

      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/documents/upload', authenticate, upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { projectId } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedDocuments = [];

      for (const file of files) {
        const document = await storage.createDocument({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          projectId: projectId ? parseInt(projectId) : null,
          uploadedBy: req.userId
        });

        // Simulate document processing
        setTimeout(async () => {
          await storage.updateDocument(document.id, {
            processingStatus: 'processing',
            processingProgress: 50
          });

          // Simulate completion after another delay
          setTimeout(async () => {
            await storage.updateDocument(document.id, {
              processingStatus: 'completed',
              processingProgress: 100,
              extractedContent: 'Extracted content from document...'
            });

            // Generate sample use cases
            const sampleUseCases = [
              {
                title: "User Authentication & Authorization",
                description: "Users should be able to securely log in using multi-factor authentication and maintain session state across the application.",
                actors: ["Admin", "End User"],
                dependencies: ["Identity Service", "Session Management"],
                priority: "high" as const,
                projectId: projectId ? parseInt(projectId) : null,
                sourceDocumentId: document.id
              },
              {
                title: "Payment Processing Workflow",
                description: "System should handle credit card payments, validation, and confirmation with proper error handling and fraud detection.",
                actors: ["Customer", "Payment Gateway", "Fraud Detection Service"],
                dependencies: ["Payment Gateway API", "Fraud Detection System"],
                priority: "critical" as const,
                projectId: projectId ? parseInt(projectId) : null,
                sourceDocumentId: document.id
              }
            ];

            for (const useCaseData of sampleUseCases) {
              const useCase = await storage.createUseCase({
                ...useCaseData,
                createdBy: req.userId
              });

              await storage.createActivity({
                userId: req.userId,
                action: 'generated_use_case',
                entityType: 'use_case',
                entityId: useCase.id,
                details: `AI generated use case: ${useCase.title}`
              });
            }

            await storage.createActivity({
              userId: req.userId,
              action: 'processed_document',
              entityType: 'document',
              entityId: document.id,
              details: `Completed processing: ${document.originalName}`
            });
          }, 3000);
        }, 2000);

        uploadedDocuments.push(document);
      }

      await storage.createActivity({
        userId: req.userId,
        action: 'uploaded_documents',
        entityType: 'document',
        entityId: null,
        details: `Uploaded ${files.length} document(s)`
      });

      res.status(201).json(uploadedDocuments);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/documents/url', authenticate, async (req, res) => {
    try {
      const { url, projectId } = req.body;

      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }

      // Create document entry for URL
      const document = await storage.createDocument({
        filename: `url_${Date.now()}`,
        originalName: url,
        mimeType: 'text/html',
        size: 0,
        url: url,
        projectId: projectId ? parseInt(projectId) : null,
        uploadedBy: req.userId
      });

      // Simulate URL processing
      setTimeout(async () => {
        await storage.updateDocument(document.id, {
          processingStatus: 'completed',
          processingProgress: 100,
          extractedContent: 'Content extracted from URL...'
        });

        await storage.createActivity({
          userId: req.userId,
          action: 'processed_url',
          entityType: 'document',
          entityId: document.id,
          details: `Processed URL: ${url}`
        });
      }, 2000);

      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Use Cases routes
  app.get('/api/use-cases', authenticate, async (req, res) => {
    try {
      const { projectId, status } = req.query;
      let useCases;

      if (projectId) {
        useCases = await storage.getUseCasesByProject(parseInt(projectId as string));
      } else if (status) {
        useCases = await storage.getUseCasesByStatus(status as string);
      } else {
        // Return all use cases if no filter specified
        const user = await storage.getUser(req.userId);
        useCases = await storage.getUseCasesByUser(req.userId);
      }

      res.json(useCases || []);
    } catch (error) {
      console.error('Error fetching use cases:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/use-cases', authenticate, async (req, res) => {
    try {
      const useCaseData = insertUseCaseSchema.parse(req.body);
      const useCase = await storage.createUseCase({
        ...useCaseData,
        createdBy: req.userId
      });

      await storage.createActivity({
        userId: req.userId,
        action: 'created_use_case',
        entityType: 'use_case',
        entityId: useCase.id,
        details: `Created use case: ${useCase.title}`
      });

      res.status(201).json(useCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid use case data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.patch('/api/use-cases/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const useCase = await storage.updateUseCase(id, updates);
      if (!useCase) {
        return res.status(404).json({ message: 'Use case not found' });
      }

      await storage.createActivity({
        userId: req.userId,
        action: 'updated_use_case',
        entityType: 'use_case',
        entityId: useCase.id,
        details: `Updated use case: ${useCase.title}`
      });

      res.json(useCase);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/use-cases/:id/approve', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const useCase = await storage.approveUseCase(id, req.userId);
      if (!useCase) {
        return res.status(404).json({ message: 'Use case not found' });
      }

      // Automatically assign to architect maker after approval by BA checker
      const architectMakers = await storage.getUsersByRole('architect_maker');
      if (architectMakers.length > 0) {
        await storage.createAssignment({
          type: 'architecture_design',
          entityId: useCase.id,
          toUserId: architectMakers[0].id,
          fromUserId: req.userId,
          comments: `Auto-assigned for architecture design: ${useCase.title}`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        await storage.createActivity({
          userId: req.userId,
          action: 'auto_assigned_architect_maker',
          entityType: 'use_case',
          entityId: useCase.id,
          details: `Auto-assigned to architect maker: ${architectMakers[0].fullName}`
        });
      }
      
      await storage.createActivity({
        userId: req.userId,
        action: 'approved_use_case',
        entityType: 'use_case',
        entityId: useCase.id,
        details: `Approved use case: ${useCase.title}`
      });
      
      res.json(useCase);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/use-cases/:id/reject', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      if (!req.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const useCase = await storage.rejectUseCase(id, req.userId, reason);
      if (!useCase) {
        return res.status(404).json({ message: 'Use case not found' });
      }
      
      await storage.createActivity({
        userId: req.userId,
        action: 'rejected_use_case',
        entityType: 'use_case',
        entityId: useCase.id,
        details: `Rejected use case: ${useCase.title}${reason ? ` - Reason: ${reason}` : ''}`
      });
      
      res.json(useCase);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Project approval routes
  app.patch('/api/projects/:id/approve', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const project = await storage.updateProject(id, { status: 'active' });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      await storage.createActivity({
        userId: req.userId,
        action: 'approved_project',
        entityType: 'project',
        entityId: project.id,
        details: `Approved project: ${project.name}`
      });
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/projects/:id/reject', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      if (!req.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const project = await storage.updateProject(id, { status: 'Rejected' });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      await storage.createActivity({
        userId: req.userId,
        action: 'rejected_project',
        entityType: 'project',
        entityId: project.id,
        details: `Rejected project: ${project.name}${reason ? ` - Reason: ${reason}` : ''}`
      });
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Assignments routes
  app.get('/api/assignments', authenticate, async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByUser(req.userId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/assignments', authenticate, async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment({
        ...assignmentData,
        fromUserId: req.userId
      });

      await storage.createActivity({
        userId: req.userId,
        action: 'created_assignment',
        entityType: 'assignment',
        entityId: assignment.id,
        details: `Created assignment for ${assignmentData.type}`
      });

      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid assignment data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Assignments routes
  app.get('/api/assignments', authenticate, async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByUser(req.userId!);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Activities routes
  app.get('/api/activities', authenticate, async (req, res) => {
    try {
      const { limit } = req.query;
      const activities = await storage.getRecentActivities(limit ? parseInt(limit as string) : 10);
      
      // Get user details for activities
      const activitiesWithUsers = await Promise.all(
        activities.map(async (activity) => {
          const user = await storage.getUser(activity.userId!);
          return {
            ...activity,
            user: user ? {
              id: user.id,
              fullName: user.fullName,
              role: user.role
            } : null
          };
        })
      );

      res.json(activitiesWithUsers);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Statistics routes
  app.get('/api/stats', authenticate, async (req, res) => {
    try {
      const stats = await storage.getStats(req.userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // AI Suggestions routes
  app.get('/api/ai-suggestions', authenticate, async (req, res) => {
    try {
      const suggestions = await storage.getAISuggestionsByUser(req.userId);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/ai-suggestions/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      const suggestion = await storage.updateAISuggestion(id, { status });
      if (!suggestion) {
        return res.status(404).json({ message: 'Suggestion not found' });
      }

      await storage.createActivity({
        userId: req.userId,
        action: `${status}_ai_suggestion`,
        entityType: 'suggestion',
        entityId: suggestion.id,
        details: `${status === 'accepted' ? 'Accepted' : 'Dismissed'} AI suggestion`
      });

      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Initialize AWS Bedrock client
  const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  // Function to fetch and parse URL content
  async function fetchUrlContent(url: string): Promise<{ title: string; content: string; headings: string[]; links: string[] }> {
    try {
      console.log(`Fetching content from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Smart-SDLC-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, footer, aside, .ad, .advertisement').remove();
      
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
      
      // Extract main content
      let content = '';
      const contentSelectors = ['main', '[role="main"]', '.content', '.main-content', 'article', '.article'];
      
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }
      
      // Fallback to body content if no main content area found
      if (!content) {
        content = $('body').text().trim();
      }
      
      // Clean up content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim()
        .substring(0, 8000); // Limit content length
      
      // Extract headings
      const headings: string[] = [];
      $('h1, h2, h3, h4, h5, h6').each((_, element) => {
        const heading = $(element).text().trim();
        if (heading && !headings.includes(heading)) {
          headings.push(heading);
        }
      });
      
      // Extract important links
      const links: string[] = [];
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        if (href && text && href.startsWith('http') && text.length > 5) {
          links.push(`${text}: ${href}`);
        }
      });
      
      return {
        title,
        content,
        headings: headings.slice(0, 10),
        links: links.slice(0, 5)
      };
    } catch (error) {
      console.error('Error fetching URL content:', error);
      throw new Error(`Failed to fetch content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Function to call AWS Bedrock Claude
  async function callClaudeAPI(prompt: string): Promise<string> {
    // Try different Claude models in order of preference (newest first)
    const modelsToTry = [
      "anthropic.claude-3-5-sonnet-20241022-v2:0", // Claude 3.5 Sonnet (latest)
      "anthropic.claude-3-5-sonnet-20240620-v1:0", // Claude 3.5 Sonnet (older)
      "anthropic.claude-3-sonnet-20240229-v1:0",   // Claude 3 Sonnet
      "anthropic.claude-3-haiku-20240307-v1:0",    // Claude 3 Haiku
      "anthropic.claude-v2:1",                     // Legacy fallback
      "anthropic.claude-v2"                        // Legacy fallback
    ];

    for (const modelId of modelsToTry) {
      try {
        console.log(`Attempting to use model: ${modelId}`);
        
        let payload;
        if (modelId.startsWith('anthropic.claude-v2') || modelId.startsWith('anthropic.claude-instant')) {
          // Legacy Claude v2 format
          payload = {
            prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
            max_tokens_to_sample: 4000,
            temperature: 0.1,
            top_p: 0.9,
          };
        } else {
          // Claude v3 format
          payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4000,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          };
        }

        const command = new InvokeModelCommand({
          modelId: modelId,
          body: JSON.stringify(payload),
          contentType: "application/json",
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        console.log(`Successfully used model: ${modelId}`);
        
        // Extract response based on model format
        if (modelId.startsWith('anthropic.claude-v2') || modelId.startsWith('anthropic.claude-instant')) {
          return responseBody.completion;
        } else {
          return responseBody.content[0].text;
        }
      } catch (error) {
        console.log(`Model ${modelId} failed:`, error instanceof Error ? error.message : 'Unknown error');
        // Try next model
        continue;
      }
    }

    throw new Error('All Claude models failed. Please check your AWS Bedrock access and ensure Claude models are enabled in your region.');
  }

  // AI Query endpoint with AWS Bedrock Claude integration
  app.post("/api/ai/query", authenticate, async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
      }

      // Check for URL in the message
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.match(urlRegex);
      
      let analysisPrompt = '';
      let urlContent = null;

      if (urls && urls.length > 0) {
        const url = urls[0];
        console.log(`Processing URL analysis request for: ${url}`);
        
        try {
          urlContent = await fetchUrlContent(url);
          
          analysisPrompt = `You are a Smart SDLC AI Assistant specializing in creating business analyst-ready requirements documentation.

I have analyzed this URL: ${url}

Page Title: ${urlContent.title}

Key Headings:
${urlContent.headings.map(h => `- ${h}`).join('\n')}

Page Content:
${urlContent.content}

${urlContent.links.length > 0 ? `\nImportant Links:\n${urlContent.links.map(l => `- ${l}`).join('\n')}` : ''}

User Request: ${message}

Create a comprehensive, business analyst-ready requirements specification document with the following structure:

## 🎯 EXECUTIVE SUMMARY
Provide a 2-3 sentence overview of what this system does and its business value.

## 🏗️ SYSTEM OVERVIEW
- **Purpose**: What problem does this solve?
- **Scope**: What's included/excluded?
- **Key Stakeholders**: Who are the primary users?

## 📋 USE CASES
Format each use case as:

### UC-001: [Use Case Name]
**Actor**: [Primary user type]
**Goal**: [What they want to achieve]
**Preconditions**: [What must be true before starting]
**Main Flow**:
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Postconditions**: [End state]
**Business Value**: [Why this matters]

[Continue with UC-002, UC-003, etc.]

## 🔧 FUNCTIONAL REQUIREMENTS
Group by category:
### Data Management
- [Requirement 1]
- [Requirement 2]

### User Interface
- [Requirement 1]
- [Requirement 2]

### Business Logic
- [Requirement 1]
- [Requirement 2]

## ⚡ NON-FUNCTIONAL REQUIREMENTS
### Performance
- [Specific metrics]

### Security
- [Security requirements]

### Compliance
- [Regulatory requirements]

### Scalability
- [Growth requirements]

## 📊 DATA REQUIREMENTS
### Entities
- **[Entity Name]**: [Description and key attributes]

### Data Flow
- [How data moves through the system]

## 🔗 INTEGRATION REQUIREMENTS
- **External System 1**: [Integration details]
- **External System 2**: [Integration details]

## ✅ ACCEPTANCE CRITERIA
For each major feature, define specific, testable criteria:
- **Feature 1**: [Criteria]
- **Feature 2**: [Criteria]

## 📈 SUCCESS METRICS
- [Measurable business outcomes]

Make this document actionable, specific, and ready for development teams to implement. Use clear, business-friendly language that non-technical stakeholders can understand.`;

        } catch (fetchError) {
          console.error('Error fetching URL:', fetchError);
          analysisPrompt = `I encountered an error fetching the URL content: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}

However, I can still help with your request: ${message}

Please provide more details about what you're looking for, or try sharing the content directly if the URL is not accessible.`;
        }
      } else {
        // No URL provided - general SDLC assistance
        analysisPrompt = `You are a Smart SDLC AI Assistant specializing in software development lifecycle management. You help with:

- Requirements analysis and documentation
- Use case generation and refinement  
- Project planning and task management
- Architecture and design recommendations
- Code review and quality assurance
- DevOps and deployment strategies
- Stakeholder communication

User Request: ${message}

Please provide detailed, actionable guidance based on software development best practices. Be specific and include practical recommendations that can be implemented immediately.`;
      }

      // Get response from Claude
      const aiResponse = await callClaudeAPI(analysisPrompt);

      // Log the AI interaction
      await storage.createActivity({
        userId: req.userId!,
        action: 'ai_query',
        entityType: 'ai_chat',
        details: `AI query: ${message.substring(0, 100)}...`,
        metadata: { 
          messageLength: message.length,
          hasUrl: urls && urls.length > 0,
          urlProcessed: urls?.[0] || null,
          responseLength: aiResponse.length,
          urlTitle: urlContent?.title || null
        }
      });

      res.json({ 
        response: aiResponse,
        hasUrl: urls && urls.length > 0,
        processedUrl: urls?.[0] || null,
        urlTitle: urlContent?.title || null,
        contentExtracted: urlContent ? true : false
      });

    } catch (error) {
      console.error('AI Query Error:', error);
      
      const errorResponse = `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}

This could be due to:
- Network connectivity issues
- AWS Bedrock service availability
- URL accessibility problems
- Content parsing difficulties

Please try again, or if the issue persists, provide the content directly for analysis.`;

      res.json({ response: errorResponse, error: true });
    }
  });

  // Requirements Management Routes
  app.post("/api/requirements", authenticate, async (req: Request, res: Response) => {
    try {
      const validatedData = insertRequirementSchema.parse(req.body);
      const requirement = await storage.createRequirement({
        ...validatedData,
        createdBy: req.userId!
      });
      res.json(requirement);
    } catch (error) {
      console.error('Error creating requirement:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/requirements", authenticate, async (req: Request, res: Response) => {
    try {
      const requirements = await storage.getRequirementsByUser(req.userId!);
      res.json(requirements);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/requirements/:id/accept", authenticate, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const requirement = await storage.acceptRequirement(id, req.userId!);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      res.json(requirement);
    } catch (error) {
      console.error('Error accepting requirement:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/requirements/:id/assign-pm", authenticate, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { pmId } = req.body;
      const requirement = await storage.assignToPm(id, pmId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      res.json(requirement);
    } catch (error) {
      console.error('Error assigning to PM:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced AI Query with Requirements Creation
  app.post("/api/ai/analyze-and-save", authenticate, async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
      }

      // Check for URL in the message
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.match(urlRegex);
      
      let aiResponse = '';
      let urlContent = null;
      let requirement = null;

      if (urls && urls.length > 0) {
        const url = urls[0];
        console.log(`Processing URL analysis request for: ${url}`);
        
        try {
          urlContent = await fetchUrlContent(url);
          
          const analysisPrompt = `You are a Smart SDLC AI Assistant specializing in creating business analyst-ready requirements documentation.

I have analyzed this URL: ${url}

Page Title: ${urlContent.title}

Key Headings:
${urlContent.headings.map(h => `- ${h}`).join('\n')}

Page Content:
${urlContent.content}

${urlContent.links.length > 0 ? `\nImportant Links:\n${urlContent.links.map(l => `- ${l}`).join('\n')}` : ''}

User Request: ${message}

Create a comprehensive, business analyst-ready requirements specification document with the following structure:

## 🎯 EXECUTIVE SUMMARY
Provide a 2-3 sentence overview of what this system does and its business value.

## 🏗️ SYSTEM OVERVIEW
- **Purpose**: What problem does this solve?
- **Scope**: What's included/excluded?
- **Key Stakeholders**: Who are the primary users?

## 📋 USE CASES
Format each use case as:

### UC-001: [Use Case Name]
**Actor**: [Primary user type]
**Goal**: [What they want to achieve]
**Preconditions**: [What must be true before starting]
**Main Flow**:
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Postconditions**: [End state]
**Business Value**: [Why this matters]

[Continue with UC-002, UC-003, etc.]

## 🔧 FUNCTIONAL REQUIREMENTS
Group by category:
### Data Management
- [Requirement 1]
- [Requirement 2]

### User Interface
- [Requirement 1]
- [Requirement 2]

### Business Logic
- [Requirement 1]
- [Requirement 2]

## ⚡ NON-FUNCTIONAL REQUIREMENTS
### Performance
- [Specific metrics]

### Security
- [Security requirements]

### Compliance
- [Regulatory requirements]

### Scalability
- [Growth requirements]

## 📊 DATA REQUIREMENTS
### Entities
- **[Entity Name]**: [Description and key attributes]

### Data Flow
- [How data moves through the system]

## 🔗 INTEGRATION REQUIREMENTS
- **External System 1**: [Integration details]
- **External System 2**: [Integration details]

## ✅ ACCEPTANCE CRITERIA
For each major feature, define specific, testable criteria:
- **Feature 1**: [Criteria]
- **Feature 2**: [Criteria]

## 📈 SUCCESS METRICS
- [Measurable business outcomes]

Make this document actionable, specific, and ready for development teams to implement. Use clear, business-friendly language that non-technical stakeholders can understand.`;

          aiResponse = await callClaudeAPI(analysisPrompt);

          // Save as requirement
          requirement = await storage.createRequirement({
            title: `Requirements Specification: ${urlContent.title}`,
            content: aiResponse,
            sourceUrl: url,
            projectId: null,
            metadata: {
              extractedHeadings: urlContent.headings,
              extractedLinks: urlContent.links,
              generatedAt: new Date().toISOString()
            },
            createdBy: req.userId!
          });

          // Extract and save use cases from AI response
          const useCaseRegex = /### UC-\d+:\s*(.+?)(?=###|##|\n\n|$)/g;
          const useCaseMatches = [];
          let match;
          while ((match = useCaseRegex.exec(aiResponse)) !== null) {
            useCaseMatches.push(match);
          }
          
          for (const match of useCaseMatches) {
            const useCaseContent = match[0];
            const title = match[1]?.trim() || 'Generated Use Case';
            
            // Extract actor, goal, and other details
            const actorMatch = useCaseContent.match(/\*\*Actor\*\*:\s*(.+?)(?=\n|\*\*)/);
            const goalMatch = useCaseContent.match(/\*\*Goal\*\*:\s*(.+?)(?=\n|\*\*)/);
            const actor = actorMatch ? actorMatch[1].trim() : 'User';
            const goal = goalMatch ? goalMatch[1].trim() : title;
            
            // Create use case
            const useCase = await storage.createUseCase({
              title: title,
              description: goal,
              actors: [actor],
              dependencies: null,
              priority: 'medium',
              projectId: 1,
              createdBy: req.userId!
            });

            await storage.createActivity({
              userId: req.userId!,
              action: 'generated_use_case',
              entityType: 'use_case',
              entityId: useCase.id,
              details: `AI generated use case: ${useCase.title}`
            });
          }

          // If no structured use cases found, create a general one
          if (useCaseMatches.length === 0) {
            const useCase = await storage.createUseCase({
              title: `System Requirements: ${urlContent.title}`,
              description: `Comprehensive requirements and use cases generated from URL analysis of ${url}`,
              actors: ['System User'],
              dependencies: null,
              priority: 'medium',
              projectId: 1,
              createdBy: req.userId!
            });

            await storage.createActivity({
              userId: req.userId!,
              action: 'generated_use_case',
              entityType: 'use_case',
              entityId: useCase.id,
              details: `AI generated comprehensive use case: ${useCase.title}`
            });
          }

        } catch (fetchError) {
          console.error('Error fetching URL:', fetchError);
          aiResponse = `I encountered an error fetching the URL content: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}

However, I can still help with your request: ${message}

Please provide more details about what you're looking for, or try sharing the content directly if the URL is not accessible.`;
        }
      } else {
        // No URL provided - general SDLC assistance
        const analysisPrompt = `You are a Smart SDLC AI Assistant specializing in software development lifecycle management. You help with:

- Requirements analysis and documentation
- Use case generation and refinement  
- Project planning and task management
- Architecture and design recommendations
- Code review and quality assurance
- DevOps and deployment strategies
- Stakeholder communication

User Request: ${message}

Please provide detailed, actionable guidance based on software development best practices. Be specific and include practical recommendations that can be implemented immediately.`;

        aiResponse = await callClaudeAPI(analysisPrompt);
      }

      // Log the AI interaction
      await storage.createActivity({
        userId: req.userId!,
        action: 'ai_query_with_save',
        entityType: 'requirement',
        entityId: requirement?.id,
        details: `AI query with requirement creation: ${message.substring(0, 100)}...`,
        metadata: { 
          messageLength: message.length,
          hasUrl: urls && urls.length > 0,
          urlProcessed: urls?.[0] || null,
          responseLength: aiResponse.length,
          urlTitle: urlContent?.title || null,
          requirementId: requirement?.id
        }
      });

      res.json({ 
        response: aiResponse,
        requirement,
        hasUrl: urls && urls.length > 0,
        processedUrl: urls?.[0] || null,
        urlTitle: urlContent?.title || null,
        contentExtracted: urlContent ? true : false,
        showActions: requirement ? true : false
      });

    } catch (error) {
      console.error('AI Query with Save Error:', error);
      
      const errorResponse = `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}

This could be due to:
- Network connectivity issues
- AWS Bedrock service availability
- URL accessibility problems
- Content parsing difficulties

Please try again, or if the issue persists, provide the content directly for analysis.`;

      res.json({ response: errorResponse, error: true });
    }
  });

  // Generate deliverables from requirements
  app.post("/api/requirements/:id/generate-deliverables", authenticate, async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.id);
      const requirement = await storage.getRequirement(requirementId);
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // Generate AI-powered deliverables
      const aiResponse = await callClaudeAPI(`
        Based on this requirements specification, generate a comprehensive set of deliverables for development teams:

        ${requirement.content}

        Create deliverables in this structure:
        1. Epic: Main business capability
        2. Stories: User-facing features  
        3. Tasks: Technical implementation work
        4. Bugs/Issues: Known issues to address

        For each deliverable, provide:
        - Title
        - Description
        - Type (epic/story/task/bug)
        - Priority (high/medium/low)
        - Story Points (1-13)
        - Acceptance Criteria (array of strings)
        - Dependencies (array of strings)
        - Labels (array of strings)

        Return ONLY a valid JSON array with no additional text.
      `);

      // Parse AI response and create deliverables
      let deliverables;
      try {
        deliverables = JSON.parse(aiResponse);
      } catch {
        // Fallback: create basic deliverable structure
        deliverables = [
          {
            title: "Epic: Implement Regulatory Compliance System",
            description: "Main epic for regulatory compliance implementation based on analyzed requirements",
            type: "epic",
            priority: "high",
            storyPoints: null,
            acceptanceCriteria: ["System meets all regulatory requirements", "Compliance reports generated successfully"],
            dependencies: [],
            labels: ["compliance", "regulatory", "epic"]
          },
          {
            title: "Story: User Registration and Authentication",
            description: "Implement secure user registration and authentication system",
            type: "story",
            priority: "high",
            storyPoints: 8,
            acceptanceCriteria: ["Users can register with email and password", "Users can login securely", "Password reset functionality works"],
            dependencies: [],
            labels: ["authentication", "security", "user-management"]
          },
          {
            title: "Task: Set up database schema",
            description: "Create and configure database tables for the application",
            type: "task",
            priority: "high",
            storyPoints: 5,
            acceptanceCriteria: ["Database schema is created", "All tables have proper constraints", "Indexes are optimized"],
            dependencies: [],
            labels: ["database", "infrastructure", "setup"]
          }
        ];
      }

      // Save deliverables
      const savedDeliverables = [];
      for (const deliverable of deliverables) {
        const saved = await storage.createDeliverable({
          requirementId,
          title: deliverable.title,
          description: deliverable.description,
          type: deliverable.type,
          priority: deliverable.priority,
          storyPoints: deliverable.storyPoints,
          acceptanceCriteria: deliverable.acceptanceCriteria || [],
          dependencies: deliverable.dependencies || [],
          labels: deliverable.labels || [],
          metadata: { generatedAt: new Date().toISOString() }
        });
        savedDeliverables.push(saved);
      }

      // Generate Jira-compatible export data
      const jiraData = savedDeliverables.map(d => ({
        summary: d.title,
        description: d.description,
        issueType: d.type,
        priority: d.priority,
        storyPoints: d.storyPoints,
        acceptanceCriteria: d.acceptanceCriteria,
        labels: d.labels,
        components: [],
        fixVersions: []
      }));

      res.json({
        deliverables: savedDeliverables,
        jiraData,
        totalCount: savedDeliverables.length
      });
    } catch (error) {
      console.error('Error generating deliverables:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Export requirements as PDF (simplified - returns formatted content)
  app.get("/api/requirements/:id/export", authenticate, async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.id);
      const requirement = await storage.getRequirement(requirementId);
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // For now, return formatted content. In production, generate actual PDF
      const pdfContent = {
        title: requirement.title,
        content: requirement.content,
        metadata: {
          createdAt: requirement.createdAt,
          version: requirement.version,
          status: requirement.status,
          sourceUrl: requirement.sourceUrl,
          downloadUrl: `/api/requirements/${requirementId}/download`
        }
      };

      res.json(pdfContent);
    } catch (error) {
      console.error('Error exporting requirement:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get Project Managers for assignment
  app.get("/api/users/project-managers", authenticate, async (req: Request, res: Response) => {
    try {
      const projectManagers = await storage.getUsersByRole("pm");
      res.json(projectManagers);
    } catch (error) {
      console.error('Error fetching project managers:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Export complete requirements specification as markdown
  app.get("/api/requirements/export", authenticate, async (req: Request, res: Response) => {
    try {
      const requirements = await storage.getRequirementsByUser(req.userId!);
      const useCases = await storage.getUseCasesByUser(req.userId!);
      
      let markdown = `# Smart SDLC Requirements Specification\n\n`;
      markdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      
      if (requirements.length > 0) {
        markdown += `## Requirements Overview\n\n`;
        markdown += `Total Requirements: ${requirements.length}\n\n`;
        
        requirements.forEach((req, index) => {
          markdown += `### ${index + 1}. ${req.title}\n\n`;
          markdown += `**Description:** ${req.description}\n\n`;
          markdown += `**Priority:** ${req.priority || 'Not specified'}\n\n`;
          markdown += `**Status:** ${req.status || 'Draft'}\n\n`;
          if (req.sourceUrl) {
            markdown += `**Source URL:** ${req.sourceUrl}\n\n`;
          }
          markdown += `**Created:** ${req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Unknown'}\n\n`;
          if (req.content && req.content.trim()) {
            markdown += `**Content:**\n${req.content}\n\n`;
          }
          markdown += `---\n\n`;
        });
      }
      
      if (useCases.length > 0) {
        markdown += `## Use Cases\n\n`;
        markdown += `Total Use Cases: ${useCases.length}\n\n`;
        
        useCases.forEach((useCase, index) => {
          markdown += `### ${index + 1}. ${useCase.title}\n\n`;
          markdown += `**Description:** ${useCase.description}\n\n`;
          markdown += `**Actors:** ${useCase.actors?.join(', ') || 'Not specified'}\n\n`;
          markdown += `**Priority:** ${useCase.priority || 'Not specified'}\n\n`;
          markdown += `**Status:** ${useCase.status || 'Draft'}\n\n`;
          if (useCase.dependencies && useCase.dependencies.length > 0) {
            markdown += `**Dependencies:** ${useCase.dependencies.join(', ')}\n\n`;
          }
          markdown += `**Created:** ${useCase.createdAt ? new Date(useCase.createdAt).toLocaleDateString() : 'Unknown'}\n\n`;
          markdown += `---\n\n`;
        });
      }
      
      if (requirements.length === 0 && useCases.length === 0) {
        markdown += `## Getting Started\n\n`;
        markdown += `No requirements or use cases found. Use the AI Assistant to:\n\n`;
        markdown += `- Analyze URLs to generate comprehensive requirements\n`;
        markdown += `- Create detailed use cases from specifications\n`;
        markdown += `- Generate project deliverables and tasks\n\n`;
        markdown += `Simply paste a URL or describe your project needs to get started.\n\n`;
      }
      
      markdown += `\n---\n\n`;
      markdown += `*Generated by Smart SDLC - AI-Powered Software Development Lifecycle Management*\n`;
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="smart-sdlc-specification.md"');
      res.send(markdown);
    } catch (error) {
      console.error("Error exporting requirements:", error);
      res.status(500).json({ error: "Failed to export requirements specification" });
    }
  });

  // Deliverables routes
  app.get('/api/deliverables/:useCaseId', authenticate, async (req, res) => {
    try {
      const useCaseId = parseInt(req.params.useCaseId);
      const deliverables = await storage.getDeliverablesByUseCase(useCaseId);
      res.json(deliverables);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/deliverables', authenticate, async (req, res) => {
    try {
      const deliverableData = req.body;
      const deliverable = await storage.createDeliverable({
        ...deliverableData,
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
      
      await storage.createActivity({
        userId: req.userId,
        action: 'created_deliverable',
        entityType: 'deliverable',
        entityId: deliverable.id,
        details: `Created deliverable: ${deliverable.title}`
      });
      
      res.status(201).json(deliverable);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Architecture Design routes
  app.get("/api/architecture-designs", authenticate, async (req, res) => {
    try {
      const designs = await storage.getArchitectureDesigns();
      res.json(designs);
    } catch (error) {
      console.error("Error fetching architecture designs:", error);
      res.status(500).json({ message: "Failed to fetch architecture designs" });
    }
  });

  app.post("/api/architecture-designs", authenticate, async (req, res) => {
    try {
      const design = await storage.createArchitectureDesign({
        ...req.body,
        architectId: req.userId
      });
      
      res.status(201).json(design);
    } catch (error) {
      console.error("Error creating architecture design:", error);
      res.status(500).json({ message: "Failed to create architecture design" });
    }
  });

  // UI Allocation routes
  app.get("/api/ui-allocations", authenticate, async (req, res) => {
    try {
      const allocations = await storage.getUIAllocations();
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching UI allocations:", error);
      res.status(500).json({ message: "Failed to fetch UI allocations" });
    }
  });

  app.post("/api/ui-allocations", authenticate, async (req, res) => {
    try {
      const allocation = await storage.createUIAllocation({
        ...req.body,
        scrumMasterId: req.userId
      });
      
      res.status(201).json(allocation);
    } catch (error) {
      console.error("Error creating UI allocation:", error);
      res.status(500).json({ message: "Failed to create UI allocation" });
    }
  });

  // Sprints routes
  app.get("/api/sprints", authenticate, async (req, res) => {
    try {
      const sprints = await storage.getSprints();
      res.json(sprints);
    } catch (error) {
      console.error("Error fetching sprints:", error);
      res.status(500).json({ message: "Failed to fetch sprints" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
