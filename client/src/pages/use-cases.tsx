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
  Plus, 
  Search, 
  Eye, 
  Edit,
  User,
  Calendar,
  FileText,
  ArrowLeft,
  Target,
  Folder,
  Check,
  X
} from "lucide-react";

const createUseCaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  actors: z.string().optional(),
  dependencies: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  projectId: z.number().optional(),
});

type CreateUseCaseData = z.infer<typeof createUseCaseSchema>;

export default function UseCases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deliverablesDialogOpen, setDeliverablesDialogOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<any>(null);
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

  // Get projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"]
  });

  const { data: useCases, isLoading } = useQuery({
    queryKey: ["/api/use-cases", selectedProjectId],
    queryFn: async () => {
      const sessionId = localStorage.getItem("sessionId");
      const response = await fetch(`/api/use-cases?projectId=${selectedProjectId}`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch use cases: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  const form = useForm<CreateUseCaseData>({
    resolver: zodResolver(createUseCaseSchema),
    defaultValues: {
      title: "",
      description: "",
      actors: "",
      dependencies: "",
      priority: "medium",
      projectId: selectedProjectId,
    },
  });

  const createUseCaseMutation = useMutation({
    mutationFn: (data: CreateUseCaseData) => {
      const processedData = {
        ...data,
        actors: data.actors ? data.actors.split(",").map(a => a.trim()) : [],
        dependencies: data.dependencies ? data.dependencies.split(",").map(d => d.trim()) : [],
      };
      return apiRequest("POST", "/api/use-cases", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases", selectedProjectId] });
      toast({
        title: "Success",
        description: "Use case created successfully",
      });
      setCreateDialogOpen(false);
      form.reset({
        title: "",
        description: "",
        actors: "",
        dependencies: "",
        priority: "medium",
        projectId: selectedProjectId,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create use case",
        variant: "destructive",
      });
    },
  });

  const approveUseCaseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/use-cases/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases"] });
      toast({
        title: "Success",
        description: "Use case approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve use case",
        variant: "destructive",
      });
    },
  });

  const rejectUseCaseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      apiRequest("PATCH", `/api/use-cases/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases"] });
      toast({
        title: "Success",
        description: "Use case rejected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject use case",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateUseCaseData) => {
    createUseCaseMutation.mutate(data);
  };

  // Filter use cases
  const filteredUseCases = Array.isArray(useCases) ? useCases.filter((useCase: any) => {
    const matchesSearch = useCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          useCase.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || useCase.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || useCase.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Review": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Approved": return "bg-green-100 text-green-800 border-green-200";
      case "Rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-blue-500 text-white";
      case "low": return "bg-gray-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link href="/projects">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </div>
          
          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Use Cases List - Primary Panel */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Use Cases</h1>
                    <p className="text-gray-600">Manage and track use case requirements</p>
                  </div>
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Use Case
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Use Case</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter use case title" {...field} />
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
                                    placeholder="Describe the use case scenario"
                                    className="min-h-[100px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="actors"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Actors (comma-separated)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="User, Admin, System" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="priority"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Priority</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="dependencies"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dependencies (comma-separated)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Service A, API B, Database C" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setCreateDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createUseCaseMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {createUseCaseMutation.isPending ? "Creating..." : "Create Use Case"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                {/* Project Selector */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Project:</span>
                  </div>
                  <Select value={selectedProjectId.toString()} onValueChange={(value) => setSelectedProjectId(parseInt(value))}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(projects) && projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search and Status Filters */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search use cases..."
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
                      <SelectItem value="Pending Review">Pending Review</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>

              {/* Use Cases Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="col-span-full flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading use cases...</div>
                  </div>
                ) : !Array.isArray(useCases) || useCases.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Use Cases</h3>
                    <p className="text-gray-500 mb-4">Create your first use case to get started</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Use Case
                    </Button>
                  </div>
                ) : (
                  filteredUseCases.map((useCase: any) => {
                    const isBusAnalyst = (currentUser as any)?.role === "business_analyst";
                    const canApprove = isBusAnalyst && useCase.status === "Pending Review";

                    return (
                      <Card key={useCase.id} className="border border-gray-200 hover:shadow-lg transition-all duration-200 group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                                {useCase.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`text-xs px-2 py-1 rounded-full ${getStatusColor(useCase.status || "draft")}`}>
                                  {useCase.status || "Draft"}
                                </Badge>
                                {useCase.priority && (
                                  <Badge className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(useCase.priority)}`}>
                                    {useCase.priority.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {useCase.description}
                          </p>
                          
                          <div className="space-y-2 mb-4">
                            {useCase.actors && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  {Array.isArray(useCase.actors) 
                                    ? useCase.actors.join(", ") 
                                    : useCase.actors}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(useCase.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs px-2"
                              onClick={() => {
                                setSelectedUseCase(useCase);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs px-2"
                              onClick={() => {
                                setSelectedUseCase(useCase);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs px-2"
                              onClick={() => {
                                setSelectedUseCase(useCase);
                                setDeliverablesDialogOpen(true);
                              }}
                            >
                              <Target className="h-3 w-3" />
                            </Button>
                            
                            {canApprove && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-xs px-2"
                                  onClick={() => approveUseCaseMutation.mutate(useCase.id)}
                                  disabled={approveUseCaseMutation.isPending}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="text-xs px-2"
                                  onClick={() => rejectUseCaseMutation.mutate({ id: useCase.id })}
                                  disabled={rejectUseCaseMutation.isPending}
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
      {/* View Use Case Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Use Case Details</DialogTitle>
          </DialogHeader>
          {selectedUseCase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-1">Title</h3>
                  <p className="text-sm">{selectedUseCase.title}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-1">Status</h3>
                  <Badge variant={selectedUseCase.status === 'approved' ? 'default' : 
                               selectedUseCase.status === 'Pending Review' ? 'secondary' : 'outline'}>
                    {selectedUseCase.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-1">Priority</h3>
                  <Badge variant={selectedUseCase.priority === 'high' || selectedUseCase.priority === 'critical' ? 'destructive' :
                               selectedUseCase.priority === 'medium' ? 'secondary' : 'outline'}>
                    {selectedUseCase.priority}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-1">Created</h3>
                  <p className="text-sm">{new Date(selectedUseCase.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Description</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedUseCase.description}</p>
                </div>
              </div>

              {selectedUseCase.actors && selectedUseCase.actors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Actors</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUseCase.actors.map((actor: string, index: number) => (
                      <Badge key={index} variant="outline">{actor}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedUseCase.dependencies && selectedUseCase.dependencies.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-600 mb-2">Dependencies</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUseCase.dependencies.map((dep: string, index: number) => (
                      <Badge key={index} variant="outline">{dep}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Use Case Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Use Case</DialogTitle>
          </DialogHeader>
          {selectedUseCase && (
            <EditUseCaseForm 
              useCase={selectedUseCase} 
              onSuccess={() => {
                setEditDialogOpen(false);
                setSelectedUseCase(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Deliverables Dialog */}
      <Dialog open={deliverablesDialogOpen} onOpenChange={setDeliverablesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deliverables for "{selectedUseCase?.title}"</DialogTitle>
          </DialogHeader>
          {selectedUseCase && (
            <DeliverablesManager useCaseId={selectedUseCase.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditUseCaseForm({ useCase, onSuccess }: { useCase: any, onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<CreateUseCaseData>({
    resolver: zodResolver(createUseCaseSchema),
    defaultValues: {
      title: useCase.title || "",
      description: useCase.description || "",
      actors: useCase.actors?.join(", ") || "",
      priority: useCase.priority || "medium",
      dependencies: useCase.dependencies?.join(", ") || "",
    },
  });

  const updateUseCaseMutation = useMutation({
    mutationFn: (data: CreateUseCaseData) => {
      const processedData = {
        ...data,
        actors: data.actors ? data.actors.split(",").map(s => s.trim()) : [],
        dependencies: data.dependencies ? data.dependencies.split(",").map(s => s.trim()) : [],
      };
      return apiRequest("PATCH", `/api/use-cases/${useCase.id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases"] });
      toast({ title: "Use case updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update use case", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateUseCaseData) => {
    updateUseCaseMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Use case title" {...field} />
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
                <Textarea placeholder="Detailed description" rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="actors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actors (comma-separated)</FormLabel>
                <FormControl>
                  <Input placeholder="User, Admin, System" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dependencies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dependencies (comma-separated)</FormLabel>
              <FormControl>
                <Input placeholder="Service A, API B, Database C" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={updateUseCaseMutation.isPending}>
            {updateUseCaseMutation.isPending ? "Updating..." : "Update Use Case"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DeliverablesManager({ useCaseId }: { useCaseId: number }) {
  const [createDeliverableOpen, setCreateDeliverableOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliverables, isLoading } = useQuery({
    queryKey: ["/api/deliverables", useCaseId],
  });

  const createDeliverableForm = useForm({
    resolver: zodResolver(z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      type: z.string().min(1, "Type is required"),
      priority: z.enum(["low", "medium", "high", "critical"]),
      estimatedHours: z.number().min(0).optional(),
      assigneeId: z.number().optional(),
    })),
    defaultValues: {
      title: "",
      description: "",
      type: "documentation",
      priority: "medium" as const,
      estimatedHours: 0,
    },
  });

  const createDeliverableMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest("POST", "/api/deliverables", {
        ...data,
        useCaseId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables", useCaseId] });
      toast({ title: "Deliverable created successfully" });
      setCreateDeliverableOpen(false);
      createDeliverableForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create deliverable", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading deliverables...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Deliverables</h3>
        <Button onClick={() => setCreateDeliverableOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deliverable
        </Button>
      </div>

      {Array.isArray(deliverables) && deliverables.length > 0 ? (
        <div className="space-y-3">
          {deliverables.map((deliverable: any) => (
            <Card key={deliverable.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{deliverable.title}</h4>
                    <Badge variant={deliverable.status === 'completed' ? 'default' : 'secondary'}>
                      {deliverable.status}
                    </Badge>
                    <Badge variant={deliverable.priority === 'high' || deliverable.priority === 'critical' ? 'destructive' : 'outline'}>
                      {deliverable.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{deliverable.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Type: {deliverable.type}</span>
                    {deliverable.estimatedHours > 0 && (
                      <span>Est. Hours: {deliverable.estimatedHours}</span>
                    )}
                    <span>Due: {new Date(deliverable.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No deliverables created yet. Click "Add Deliverable" to create one.
        </div>
      )}

      {/* Create Deliverable Dialog */}
      <Dialog open={createDeliverableOpen} onOpenChange={setCreateDeliverableOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Deliverable</DialogTitle>
          </DialogHeader>
          <Form {...createDeliverableForm}>
            <form onSubmit={createDeliverableForm.handleSubmit((data) => createDeliverableMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createDeliverableForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Deliverable title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createDeliverableForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detailed description" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createDeliverableForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="documentation">Documentation</SelectItem>
                          <SelectItem value="wireframe">Wireframe</SelectItem>
                          <SelectItem value="prototype">Prototype</SelectItem>
                          <SelectItem value="specification">Specification</SelectItem>
                          <SelectItem value="test_case">Test Case</SelectItem>
                          <SelectItem value="user_story">User Story</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createDeliverableForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createDeliverableForm.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Hours</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDeliverableOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDeliverableMutation.isPending}>
                  {createDeliverableMutation.isPending ? "Creating..." : "Create Deliverable"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}