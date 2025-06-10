import {
  users, projects, documents, useCases, assignments, activities, aiSuggestions,
  requirements, deliverables, reviews, reviewComments, architectureDesigns, uiAllocations, sprints,
  type User, type InsertUser, type Project, type InsertProject,
  type Document, type InsertDocument, type UseCase, type InsertUseCase,
  type Assignment, type InsertAssignment, type Activity, type InsertActivity,
  type AISuggestion, type InsertAISuggestion, type Requirement, type InsertRequirement,
  type Deliverable, type InsertDeliverable, type Review, type InsertReview,
  type ReviewComment, type InsertReviewComment, type ArchitectureDesign, type InsertArchitectureDesign,
  type UIAllocation, type InsertUIAllocation, type Sprint, type InsertSprint
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;

  // Projects
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject & { createdBy: number }): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;

  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument & { uploadedBy: number }): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  getDocumentsByProject(projectId: number): Promise<Document[]>;
  getDocumentsByUser(userId: number): Promise<Document[]>;

  // Use Cases
  getUseCase(id: number): Promise<UseCase | undefined>;
  createUseCase(useCase: InsertUseCase & { createdBy: number }): Promise<UseCase>;
  updateUseCase(id: number, updates: Partial<UseCase>): Promise<UseCase | undefined>;
  getUseCasesByProject(projectId: number): Promise<UseCase[]>;
  getUseCasesByUser(userId: number): Promise<UseCase[]>;
  getUseCasesByStatus(status: string): Promise<UseCase[]>;
  approveUseCase(id: number, approvedBy: number): Promise<UseCase | undefined>;
  rejectUseCase(id: number, rejectedBy: number, reason?: string): Promise<UseCase | undefined>;

  // Assignments
  getAssignment(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment & { fromUserId: number }): Promise<Assignment>;
  updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment | undefined>;
  getAssignmentsByUser(userId: number): Promise<Assignment[]>;
  getAssignmentsByGroup(group: string): Promise<Assignment[]>;

  // Activities
  createActivity(activity: InsertActivity & { userId: number }): Promise<Activity>;
  getActivitiesByUser(userId: number, limit?: number): Promise<Activity[]>;
  getRecentActivities(limit?: number): Promise<Activity[]>;

  // AI Suggestions
  getAISuggestion(id: number): Promise<AISuggestion | undefined>;
  createAISuggestion(suggestion: InsertAISuggestion & { userId: number }): Promise<AISuggestion>;
  updateAISuggestion(id: number, updates: Partial<AISuggestion>): Promise<AISuggestion | undefined>;
  getAISuggestionsByUser(userId: number): Promise<AISuggestion[]>;
  getAISuggestionsByType(type: string): Promise<AISuggestion[]>;

  // Requirements
  getRequirement(id: number): Promise<Requirement | undefined>;
  createRequirement(requirement: InsertRequirement & { createdBy: number }): Promise<Requirement>;
  updateRequirement(id: number, updates: Partial<Requirement>): Promise<Requirement | undefined>;
  getRequirementsByProject(projectId: number): Promise<Requirement[]>;
  getRequirementsByUser(userId: number): Promise<Requirement[]>;
  acceptRequirement(id: number, acceptedBy: number): Promise<Requirement | undefined>;
  assignToPm(id: number, pmId: number): Promise<Requirement | undefined>;

  // Deliverables
  getDeliverable(id: number): Promise<Deliverable | undefined>;
  createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable>;
  updateDeliverable(id: number, updates: Partial<Deliverable>): Promise<Deliverable | undefined>;
  getDeliverablesByRequirement(requirementId: number): Promise<Deliverable[]>;
  getDeliverablesByAssignee(assigneeId: number): Promise<Deliverable[]>;
  getDeliverablesByUseCase(useCaseId: number): Promise<Deliverable[]>;
  generateJiraData(requirementId: number): Promise<any[]>;

  // Reviews
  getReview(id: number): Promise<Review | undefined>;
  createReview(review: InsertReview & { reviewerId: number }): Promise<Review>;
  updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined>;
  getReviewsByRequirement(requirementId: number): Promise<Review[]>;
  getReviewsByReviewer(reviewerId: number): Promise<Review[]>;

  // Review Comments
  getReviewComment(id: number): Promise<ReviewComment | undefined>;
  createReviewComment(comment: InsertReviewComment & { userId: number }): Promise<ReviewComment>;
  updateReviewComment(id: number, updates: Partial<ReviewComment>): Promise<ReviewComment | undefined>;
  getCommentsByReview(reviewId: number): Promise<ReviewComment[]>;

  // Architecture Designs
  getArchitectureDesigns(): Promise<ArchitectureDesign[]>;
  createArchitectureDesign(design: InsertArchitectureDesign & { architectId: number }): Promise<ArchitectureDesign>;

  // UI Allocations
  getUIAllocations(): Promise<UIAllocation[]>;
  createUIAllocation(allocation: InsertUIAllocation & { scrumMasterId: number }): Promise<UIAllocation>;

  // Sprints
  getSprints(): Promise<Sprint[]>;
  createSprint(sprint: InsertSprint & { scrumMasterId: number }): Promise<Sprint>;

  // Statistics
  getStats(userId: number): Promise<{
    activeProjects: number;
    useCases: number;
    pendingReviews: number;
    documentsProcessed: number;
    requirementsCount: number;
    deliverablesCount: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private projects: Map<number, Project> = new Map();
  private documents: Map<number, Document> = new Map();
  private useCases: Map<number, UseCase> = new Map();
  private assignments: Map<number, Assignment> = new Map();
  private activities: Map<number, Activity> = new Map();
  private aiSuggestions: Map<number, AISuggestion> = new Map();
  private requirements: Map<number, Requirement> = new Map();
  private deliverables: Map<number, Deliverable> = new Map();
  private reviews: Map<number, Review> = new Map();
  private reviewComments: Map<number, ReviewComment> = new Map();
  private architectureDesigns: Map<number, ArchitectureDesign> = new Map();
  private uiAllocations: Map<number, UIAllocation> = new Map();
  private sprints: Map<number, Sprint> = new Map();
  
  private currentUserId = 1;
  private currentProjectId = 1;
  private currentDocumentId = 1;
  private currentUseCaseId = 1;
  private currentAssignmentId = 1;
  private currentActivityId = 1;
  private currentAISuggestionId = 1;
  private currentRequirementId = 1;
  private currentDeliverableId = 1;
  private currentReviewId = 1;
  private currentReviewCommentId = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Create default users with maker-checker workflow
    const defaultUsers = [
      // Business Analysts - Maker/Checker with Product Owner
      {
        username: "john.ba.maker",
        password: "maker123",
        fullName: "John Smith",
        email: "john.smith@company.com",
        role: "business_analyst_maker",
        profile: "Business Analyst - Requirements Maker",
        groups: ["BA Team", "Makers"],
        isActive: true
      },
      {
        username: "linda.ba.checker",
        password: "checker123",
        fullName: "Linda Thompson",
        email: "linda.thompson@company.com",
        role: "business_analyst_checker",
        profile: "Business Analyst Checker & Product Owner",
        groups: ["BA Team", "Checkers", "Product Owners"],
        isActive: true
      },
      // Architects - Maker/Checker
      {
        username: "alex.arch.maker",
        password: "archmaker123",
        fullName: "Alex Johnson",
        email: "alex.johnson@company.com",
        role: "architect_maker",
        profile: "Software Architect - Design Maker",
        groups: ["Architecture Team", "Makers"],
        isActive: true
      },
      {
        username: "mike.arch.checker",
        password: "archchecker123",
        fullName: "Mike Rodriguez",
        email: "mike.rodriguez@company.com",
        role: "architect_checker",
        profile: "Lead Architect - Design Checker & Architecture Lead",
        groups: ["Architecture Team", "Checkers", "Architecture Leads"],
        isActive: true
      },
      // Scrum Master (reports to Product Owner)
      {
        username: "sarah.scrum",
        password: "scrum123",
        fullName: "Sarah Williams",
        email: "sarah.williams@company.com",
        role: "scrum_master",
        profile: "Certified Scrum Master - Plans approved by Product Owner",
        groups: ["Scrum Masters", "Project Managers"],
        isActive: true
      },
      // UI Designer (reviewed by Architecture Lead)
      {
        username: "emma.designer",
        password: "design123",
        fullName: "Emma Chen",
        email: "emma.chen@company.com",
        role: "ui_designer",
        profile: "Senior UI/UX Designer - Designs reviewed by Architecture Lead",
        groups: ["Design Team"],
        isActive: true
      }
    ];

    defaultUsers.forEach(userData => {
      const user: User = {
        id: this.currentUserId++,
        ...userData,
        profile: userData.profile || null,
        groups: userData.groups || null,
        isActive: userData.isActive || true,
        createdAt: new Date()
      };
      this.users.set(user.id, user);
    });

    // Create sample projects
    const sampleProjects = [
      {
        name: "Global Clearing Platform",
        description: "Next-generation clearing and settlement platform for high-frequency trading operations",
        status: "active"
      },
      {
        name: "Risk Management Dashboard",
        description: "Real-time risk monitoring and alert system for trading portfolios",
        status: "Pending Review"
      },
      {
        name: "Regulatory Compliance Suite",
        description: "Automated compliance reporting for CFTC and SEC requirements",
        status: "draft"
      },
      {
        name: "Client Onboarding Portal",
        description: "Digital onboarding platform with KYC/AML verification",
        status: "completed"
      }
    ];

    sampleProjects.forEach(projectData => {
      const project: Project = {
        id: this.currentProjectId++,
        ...projectData,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.projects.set(project.id, project);
    });

    // Create project-specific use cases
    const projectUseCases = [
      // Global Clearing Platform (Project 1)
      {
        projectId: 1,
        useCases: [
          {
            title: "Submit Large Trader Report",
            description: "Traders must submit comprehensive reports when their positions exceed the large trader threshold as defined by the CFTC. The system must validate data completeness and accuracy before submission.",
            actors: ["Large Trader", "Compliance Officer", "CFTC System"],
            dependencies: ["Position Management System", "CFTC API", "Data Validation Service"],
            priority: "critical",
            status: "Pending Review"
          },
          {
            title: "Real-time Position Monitoring",
            description: "The system continuously monitors trader positions in real-time to identify when they approach or exceed large trader thresholds, triggering automated alerts and reporting workflows.",
            actors: ["Trading System", "Risk Manager", "Compliance Team"],
            dependencies: ["Market Data Feed", "Position Database", "Alert System"],
            priority: "high",
            status: "Approved"
          },
          {
            title: "Trade Settlement Processing",
            description: "Automated clearing and settlement of trades with real-time confirmation and exception handling for failed settlements.",
            actors: ["Settlement System", "Clearinghouse", "Trade Operations"],
            dependencies: ["Central Counterparty", "Payment System", "Risk Engine"],
            priority: "critical",
            status: "Pending Review"
          }
        ]
      },
      // Risk Management Dashboard (Project 2)
      {
        projectId: 2,
        useCases: [
          {
            title: "Portfolio Risk Analysis",
            description: "Real-time calculation of portfolio risk metrics including VaR, stress testing, and scenario analysis across all trading positions.",
            actors: ["Risk Manager", "Portfolio Manager", "Trader"],
            dependencies: ["Risk Engine", "Market Data", "Position Database"],
            priority: "high",
            status: "Pending Review"
          },
          {
            title: "Risk Alert Management",
            description: "Automated generation and escalation of risk alerts when portfolio metrics exceed predefined thresholds.",
            actors: ["Risk System", "Risk Manager", "Trading Desk"],
            dependencies: ["Alert Engine", "Notification Service", "Risk Database"],
            priority: "high",
            status: "Approved"
          },
          {
            title: "Risk Reporting Dashboard",
            description: "Interactive dashboard displaying real-time risk metrics, historical trends, and regulatory risk reports.",
            actors: ["Risk Manager", "Management", "Regulators"],
            dependencies: ["Reporting Engine", "Data Warehouse", "Visualization Tools"],
            priority: "medium",
            status: "Pending Review"
          }
        ]
      },
      // Regulatory Compliance Suite (Project 3)
      {
        projectId: 3,
        useCases: [
          {
            title: "Automated Regulatory Reporting",
            description: "Generate and submit regulatory reports to CFTC, SEC, and other regulatory bodies with automated validation and error checking.",
            actors: ["Compliance Officer", "Regulatory System", "External Regulators"],
            dependencies: ["Regulatory API", "Data Validation", "File Transfer"],
            priority: "critical",
            status: "Pending Review"
          },
          {
            title: "Compliance Rule Engine",
            description: "Real-time monitoring of trading activities against regulatory rules with automatic flagging of potential violations.",
            actors: ["Compliance System", "Trader", "Compliance Officer"],
            dependencies: ["Rule Engine", "Trade Database", "Alert System"],
            priority: "high",
            status: "Approved"
          }
        ]
      },
      // Client Onboarding Portal (Project 4)
      {
        projectId: 4,
        useCases: [
          {
            title: "Digital KYC Verification",
            description: "Automated Know Your Customer verification process with document upload, identity verification, and background checks.",
            actors: ["New Client", "KYC Officer", "Third-party Verification"],
            dependencies: ["Identity Verification API", "Document Scanner", "Background Check Service"],
            priority: "high",
            status: "Pending Review"
          },
          {
            title: "Client Account Setup",
            description: "Streamlined account creation process with automated approval workflow and account provisioning.",
            actors: ["Client", "Account Manager", "Operations Team"],
            dependencies: ["Account Management System", "Approval Workflow", "User Management"],
            priority: "medium",
            status: "Approved"
          }
        ]
      }
    ];

    projectUseCases.forEach(({ projectId, useCases }) => {
      useCases.forEach(useCaseData => {
        const useCase: UseCase = {
          id: this.currentUseCaseId++,
          ...useCaseData,
          projectId,
          createdBy: 1,
          assignedTo: null,
          assignedGroup: null,
          sourceDocumentId: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.useCases.set(useCase.id, useCase);
      });
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
      ...insertUser,
      profile: insertUser.profile || null,
      groups: insertUser.groups || null,
      isActive: true,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(projectData: InsertProject & { createdBy: number }): Promise<Project> {
    const project: Project = {
      id: this.currentProjectId++,
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(project => project.createdBy === userId);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  // Documents
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(documentData: InsertDocument & { uploadedBy: number }): Promise<Document> {
    const document: Document = {
      id: this.currentDocumentId++,
      ...documentData,
      processingStatus: "pending",
      processingProgress: 0,
      extractedContent: null,
      metadata: {},
      createdAt: new Date()
    };
    this.documents.set(document.id, document);
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...updates };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.projectId === projectId);
  }

  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.uploadedBy === userId);
  }

  // Use Cases
  async getUseCase(id: number): Promise<UseCase | undefined> {
    return this.useCases.get(id);
  }

  async createUseCase(useCaseData: InsertUseCase & { createdBy: number }): Promise<UseCase> {
    const useCase: UseCase = {
      id: this.currentUseCaseId++,
      ...useCaseData,
      status: "Pending Review",
      assignedTo: null,
      assignedGroup: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.useCases.set(useCase.id, useCase);
    return useCase;
  }

  async updateUseCase(id: number, updates: Partial<UseCase>): Promise<UseCase | undefined> {
    const useCase = this.useCases.get(id);
    if (!useCase) return undefined;
    
    const updatedUseCase = { ...useCase, ...updates, updatedAt: new Date() };
    this.useCases.set(id, updatedUseCase);
    return updatedUseCase;
  }

  async getUseCasesByProject(projectId: number): Promise<UseCase[]> {
    return Array.from(this.useCases.values()).filter(uc => uc.projectId === projectId);
  }

  async getUseCasesByUser(userId: number): Promise<UseCase[]> {
    return Array.from(this.useCases.values()).filter(uc => uc.createdBy === userId || uc.assignedTo === userId);
  }

  async getUseCasesByStatus(status: string): Promise<UseCase[]> {
    return Array.from(this.useCases.values()).filter(uc => uc.status === status);
  }

  async approveUseCase(id: number, approvedBy: number): Promise<UseCase | undefined> {
    const useCase = this.useCases.get(id);
    if (!useCase) return undefined;
    
    const updatedUseCase = { 
      ...useCase, 
      status: "Approved", 
      assignedTo: approvedBy,
      updatedAt: new Date() 
    };
    this.useCases.set(id, updatedUseCase);
    return updatedUseCase;
  }

  async rejectUseCase(id: number, rejectedBy: number, reason?: string): Promise<UseCase | undefined> {
    const useCase = this.useCases.get(id);
    if (!useCase) return undefined;
    
    const updatedUseCase = { 
      ...useCase, 
      status: "Rejected", 
      assignedTo: rejectedBy,
      metadata: { ...useCase.metadata, rejectionReason: reason },
      updatedAt: new Date() 
    };
    this.useCases.set(id, updatedUseCase);
    return updatedUseCase;
  }

  // Assignments
  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async createAssignment(assignmentData: InsertAssignment & { fromUserId: number }): Promise<Assignment> {
    const assignment: Assignment = {
      id: this.currentAssignmentId++,
      ...assignmentData,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  async updateAssignment(id: number, updates: Partial<Assignment>): Promise<Assignment | undefined> {
    const assignment = this.assignments.get(id);
    if (!assignment) return undefined;
    
    const updatedAssignment = { ...assignment, ...updates, updatedAt: new Date() };
    this.assignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async getAssignmentsByUser(userId: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(a => a.toUserId === userId);
  }

  async getAssignmentsByGroup(group: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(a => a.toGroup === group);
  }

  // Activities
  async createActivity(activityData: InsertActivity & { userId: number }): Promise<Activity> {
    const activity: Activity = {
      id: this.currentActivityId++,
      ...activityData,
      createdAt: new Date()
    };
    this.activities.set(activity.id, activity);
    return activity;
  }

  async getActivitiesByUser(userId: number, limit = 10): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getRecentActivities(limit = 10): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // AI Suggestions
  async getAISuggestion(id: number): Promise<AISuggestion | undefined> {
    return this.aiSuggestions.get(id);
  }

  async createAISuggestion(suggestionData: InsertAISuggestion & { userId: number }): Promise<AISuggestion> {
    const suggestion: AISuggestion = {
      id: this.currentAISuggestionId++,
      ...suggestionData,
      status: "pending",
      createdAt: new Date()
    };
    this.aiSuggestions.set(suggestion.id, suggestion);
    return suggestion;
  }

  async updateAISuggestion(id: number, updates: Partial<AISuggestion>): Promise<AISuggestion | undefined> {
    const suggestion = this.aiSuggestions.get(id);
    if (!suggestion) return undefined;
    
    const updatedSuggestion = { ...suggestion, ...updates };
    this.aiSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }

  async getAISuggestionsByUser(userId: number): Promise<AISuggestion[]> {
    return Array.from(this.aiSuggestions.values()).filter(s => s.userId === userId);
  }

  async getAISuggestionsByType(type: string): Promise<AISuggestion[]> {
    return Array.from(this.aiSuggestions.values()).filter(s => s.type === type);
  }

  // Requirements Methods
  async getRequirement(id: number): Promise<Requirement | undefined> {
    return this.requirements.get(id);
  }

  async createRequirement(requirementData: InsertRequirement & { createdBy: number }): Promise<Requirement> {
    const requirement: Requirement = {
      id: this.currentRequirementId++,
      title: requirementData.title,
      content: requirementData.content,
      sourceUrl: requirementData.sourceUrl || null,
      status: 'draft',
      version: 1,
      projectId: requirementData.projectId || null,
      createdBy: requirementData.createdBy,
      acceptedBy: null,
      assignedPm: null,
      acceptedAt: null,
      metadata: requirementData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.requirements.set(requirement.id, requirement);
    return requirement;
  }

  async updateRequirement(id: number, updates: Partial<Requirement>): Promise<Requirement | undefined> {
    const requirement = this.requirements.get(id);
    if (!requirement) return undefined;
    
    const updated = { ...requirement, ...updates, updatedAt: new Date() };
    this.requirements.set(id, updated);
    return updated;
  }

  async getRequirementsByProject(projectId: number): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(r => r.projectId === projectId);
  }

  async getRequirementsByUser(userId: number): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(r => r.createdBy === userId);
  }

  async acceptRequirement(id: number, acceptedBy: number): Promise<Requirement | undefined> {
    const requirement = this.requirements.get(id);
    if (!requirement) return undefined;
    
    const updated = { 
      ...requirement, 
      status: 'accepted', 
      acceptedBy, 
      acceptedAt: new Date(),
      updatedAt: new Date()
    };
    this.requirements.set(id, updated);
    return updated;
  }

  async assignToPm(id: number, pmId: number): Promise<Requirement | undefined> {
    const requirement = this.requirements.get(id);
    if (!requirement) return undefined;
    
    const updated = { ...requirement, assignedPm: pmId, updatedAt: new Date() };
    this.requirements.set(id, updated);
    return updated;
  }

  // Deliverables Methods
  async getDeliverable(id: number): Promise<Deliverable | undefined> {
    return this.deliverables.get(id);
  }

  async createDeliverable(deliverableData: InsertDeliverable): Promise<Deliverable> {
    const deliverable: Deliverable = {
      id: this.currentDeliverableId++,
      requirementId: deliverableData.requirementId || null,
      useCaseId: deliverableData.useCaseId || null,
      title: deliverableData.title,
      description: deliverableData.description,
      type: deliverableData.type,
      jiraKey: null,
      priority: deliverableData.priority || 'medium',
      storyPoints: deliverableData.storyPoints || null,
      assigneeId: deliverableData.assigneeId || null,
      status: deliverableData.status || 'todo',
      acceptanceCriteria: deliverableData.acceptanceCriteria || [],
      dependencies: deliverableData.dependencies || [],
      labels: deliverableData.labels || [],
      metadata: deliverableData.metadata || {},
      dueDate: deliverableData.dueDate || null,
      estimatedHours: deliverableData.estimatedHours || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.deliverables.set(deliverable.id, deliverable);
    return deliverable;
  }

  async updateDeliverable(id: number, updates: Partial<Deliverable>): Promise<Deliverable | undefined> {
    const deliverable = this.deliverables.get(id);
    if (!deliverable) return undefined;
    
    const updated = { ...deliverable, ...updates, updatedAt: new Date() };
    this.deliverables.set(id, updated);
    return updated;
  }

  async getDeliverablesByRequirement(requirementId: number): Promise<Deliverable[]> {
    return Array.from(this.deliverables.values()).filter(d => d.requirementId === requirementId);
  }

  async getDeliverablesByAssignee(assigneeId: number): Promise<Deliverable[]> {
    return Array.from(this.deliverables.values()).filter(d => d.assigneeId === assigneeId);
  }

  async getDeliverablesByUseCase(useCaseId: number): Promise<Deliverable[]> {
    return Array.from(this.deliverables.values()).filter(d => d.useCaseId === useCaseId);
  }

  async generateJiraData(requirementId: number): Promise<any[]> {
    const deliverables = await this.getDeliverablesByRequirement(requirementId);
    return deliverables.map(d => ({
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
  }

  // Reviews Methods
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async createReview(reviewData: InsertReview & { reviewerId: number }): Promise<Review> {
    const review: Review = {
      id: this.currentReviewId++,
      requirementId: reviewData.requirementId || null,
      reviewerId: reviewData.reviewerId,
      rating: reviewData.rating || null,
      comments: reviewData.comments || null,
      suggestions: reviewData.suggestions || [],
      status: 'pending',
      isResolved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.reviews.set(review.id, review);
    return review;
  }

  async updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined> {
    const review = this.reviews.get(id);
    if (!review) return undefined;
    
    const updated = { ...review, ...updates, updatedAt: new Date() };
    this.reviews.set(id, updated);
    return updated;
  }

  async getReviewsByRequirement(requirementId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(r => r.requirementId === requirementId);
  }

  async getReviewsByReviewer(reviewerId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(r => r.reviewerId === reviewerId);
  }

  // Review Comments Methods
  async getReviewComment(id: number): Promise<ReviewComment | undefined> {
    return this.reviewComments.get(id);
  }

  async createReviewComment(commentData: InsertReviewComment & { userId: number }): Promise<ReviewComment> {
    const comment: ReviewComment = {
      id: this.currentReviewCommentId++,
      reviewId: commentData.reviewId || null,
      userId: commentData.userId,
      comment: commentData.comment,
      isEditable: true,
      parentCommentId: commentData.parentCommentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.reviewComments.set(comment.id, comment);
    return comment;
  }

  async updateReviewComment(id: number, updates: Partial<ReviewComment>): Promise<ReviewComment | undefined> {
    const comment = this.reviewComments.get(id);
    if (!comment) return undefined;
    
    const updated = { ...comment, ...updates, updatedAt: new Date() };
    this.reviewComments.set(id, updated);
    return updated;
  }

  async getCommentsByReview(reviewId: number): Promise<ReviewComment[]> {
    return Array.from(this.reviewComments.values()).filter(c => c.reviewId === reviewId);
  }

  // Statistics
  async getStats(userId: number): Promise<{
    activeProjects: number;
    useCases: number;
    pendingReviews: number;
    documentsProcessed: number;
    requirementsCount: number;
    deliverablesCount: number;
  }> {
    const userProjects = await this.getProjectsByUser(userId);
    const userUseCases = await this.getUseCasesByUser(userId);
    const pendingAssignments = await this.getAssignmentsByUser(userId);
    const userDocuments = await this.getDocumentsByUser(userId);
    const userRequirements = await this.getRequirementsByUser(userId);
    const userDeliverables = await this.getDeliverablesByAssignee(userId);

    return {
      activeProjects: userProjects.filter(p => p.status === 'active').length,
      useCases: userUseCases.length,
      pendingReviews: pendingAssignments.filter(a => a.status === 'pending').length,
      documentsProcessed: userDocuments.filter(d => d.processingStatus === 'completed').length,
      requirementsCount: userRequirements.length,
      deliverablesCount: userDeliverables.length,
    };
  }

  // Architecture Design methods
  async getArchitectureDesigns(): Promise<ArchitectureDesign[]> {
    return Array.from(this.architectureDesigns.values());
  }

  async createArchitectureDesign(designData: InsertArchitectureDesign & { architectId: number }): Promise<ArchitectureDesign> {
    const currentArchitectureDesignId = this.architectureDesigns.size + 1;
    const design: ArchitectureDesign = {
      id: currentArchitectureDesignId,
      createdAt: new Date(),
      ...designData,
    };
    this.architectureDesigns.set(currentArchitectureDesignId, design);
    return design;
  }

  // UI Allocation methods
  async getUIAllocations(): Promise<UIAllocation[]> {
    return Array.from(this.uiAllocations.values());
  }

  async createUIAllocation(allocationData: InsertUIAllocation & { scrumMasterId: number }): Promise<UIAllocation> {
    const currentUIAllocationId = this.uiAllocations.size + 1;
    const allocation: UIAllocation = {
      id: currentUIAllocationId,
      createdAt: new Date(),
      ...allocationData,
    };
    this.uiAllocations.set(currentUIAllocationId, allocation);
    return allocation;
  }

  // Sprint methods
  async getSprints(): Promise<Sprint[]> {
    return Array.from(this.sprints.values());
  }

  async createSprint(sprintData: InsertSprint & { scrumMasterId: number }): Promise<Sprint> {
    const currentSprintId = this.sprints.size + 1;
    const sprint: Sprint = {
      id: currentSprintId,
      ...sprintData,
      status: 'planning',
      velocity: sprintData.velocity || 20,
      useCaseIds: sprintData.useCaseIds || [],
      scrumMasterId: sprintData.scrumMasterId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sprints.set(currentSprintId, sprint);
    return sprint;
  }
}

export const storage = new MemStorage();
