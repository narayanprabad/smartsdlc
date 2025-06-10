import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { AgenticAIPanel } from "@/components/ui/agentic-ai-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Folder, 
  Plus, 
  Search, 
  Calendar,
  Eye,
  Edit,
  User,
  Check,
  X
} from "lucide-react";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "on-hold", "draft"]),
});

type CreateProjectData = z.infer<typeof createProjectSchema>;

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Prevent auto-scroll - force page to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get current user data
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"]
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectData) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const approveProjectMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/projects/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve project",
        variant: "destructive",
      });
    },
  });

  const rejectProjectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      apiRequest("PATCH", `/api/projects/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project rejected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject project",
        variant: "destructive",
      });
    },
  });

  const editProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateProjectData }) => 
      apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditDialogOpen(false);
      setSelectedProject(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateProjectData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft",
    },
  });

  const editForm = useForm<CreateProjectData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft",
    },
  });

  const onSubmit = (data: CreateProjectData) => {
    createProjectMutation.mutate(data);
  };

  const onEditSubmit = (data: CreateProjectData) => {
    if (selectedProject) {
      editProjectMutation.mutate({ id: selectedProject.id, data });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "completed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "on-hold": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Pending Review": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Filter projects
  const filteredProjects = Array.isArray(projects) ? projects.filter((project: any) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects List - Primary Panel */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects</h1>
                    <p className="text-gray-600">Manage and track project development</p>
                  </div>
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mb-6 flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="col-span-full flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading projects...</div>
                  </div>
                ) : !projects || projects.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects</h3>
                    <p className="text-gray-500 mb-4">Create your first project to get started</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                ) : (
                  filteredProjects.map((project: any) => {
                    const isBusAnalyst = currentUser?.role === "business_analyst";
                    const canApprove = isBusAnalyst && project.status === "Pending Review";

                    return (
                      <Card key={project.id} className="border border-gray-200 hover:shadow-lg transition-all duration-200 group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                                {project.name}
                              </CardTitle>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status || "draft")}`}>
                                  {project.status || "Draft"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          {project.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                              {project.description}
                            </p>
                          )}
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Link href="/use-cases">
                              <Button variant="outline" size="sm" className="flex-1 text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                View Use Cases
                              </Button>
                            </Link>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs px-2"
                              onClick={() => {
                                setSelectedProject(project);
                                editForm.reset({
                                  name: project.name,
                                  description: project.description || "",
                                  status: project.status
                                });
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            
                            {canApprove && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-xs px-2"
                                  onClick={() => approveProjectMutation.mutate(project.id)}
                                  disabled={approveProjectMutation.isPending}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="text-xs px-2"
                                  onClick={() => rejectProjectMutation.mutate({ id: project.id })}
                                  disabled={rejectProjectMutation.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* AI Panel - Complementary Feature */}
            <div className="lg:col-span-1">
              <AgenticAIPanel />
            </div>
          </div>
        </div>
      </main>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the project goals and scope"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the project goals and scope"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={editProjectMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {editProjectMutation.isPending ? "Updating..." : "Update Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}