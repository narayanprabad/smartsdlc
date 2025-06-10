import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Building, 
  Brain, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Layers,
  Database,
  Network,
  Shield,
  LogOut,
  Home
} from "lucide-react";

const architectureDesignSchema = z.object({
  systemOverview: z.string().min(10, "System overview is required"),
  architecturalPattern: z.string().min(1, "Architectural pattern is required"),
  technologyStack: z.string().min(5, "Technology stack is required"),
  dataFlow: z.string().min(10, "Data flow description is required"),
  securityConsiderations: z.string().min(10, "Security considerations are required"),
  scalabilityPlan: z.string().min(10, "Scalability plan is required"),
  deploymentStrategy: z.string().min(5, "Deployment strategy is required"),
  useCaseId: z.number()
});

type ArchitectureDesignData = z.infer<typeof architectureDesignSchema>;

export default function ArchitectDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUseCase, setSelectedUseCase] = useState<any>(null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/assignments'],
  });

  const { data: useCases = [], isLoading: useCasesLoading } = useQuery({
    queryKey: ['/api/use-cases'],
  });

  const { data: architectureDesigns = [], isLoading: designsLoading } = useQuery({
    queryKey: ['/api/architecture-designs'],
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['/api/sprints'],
  });

  const architectureForm = useForm<ArchitectureDesignData>({
    resolver: zodResolver(architectureDesignSchema),
    defaultValues: {
      systemOverview: '',
      architecturalPattern: 'microservices',
      technologyStack: '',
      dataFlow: '',
      securityConsiderations: '',
      scalabilityPlan: '',
      deploymentStrategy: 'containerized',
      useCaseId: 0
    }
  });

  const createDesignMutation = useMutation({
    mutationFn: async (data: ArchitectureDesignData) => {
      return await apiRequest('/api/architecture-designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Architecture Design Created",
        description: "Architecture design has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/architecture-designs'] });
      architectureForm.reset();
      setSelectedUseCase(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create architecture design",
        variant: "destructive",
      });
    },
  });

  const onSubmitDesign = (data: ArchitectureDesignData) => {
    if (!selectedUseCase) {
      toast({
        title: "Error",
        description: "Please select a use case first",
        variant: "destructive",
      });
      return;
    }
    
    createDesignMutation.mutate({
      ...data,
      useCaseId: selectedUseCase.id
    });
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  // Filter assignments for architecture design type assigned to current user
  const architectureAssignments = Array.isArray(assignments) ? 
    assignments.filter((assignment: any) => 
      assignment.type === 'architecture_design' && 
      assignment.status === 'pending' &&
      assignment.toUserId === user?.id
    ) : [];

  // Get use cases for the assignments
  const assignedUseCases = architectureAssignments.map((assignment: any) => {
    const useCase = useCases.find((uc: any) => uc.id === assignment.entityId);
    return useCase ? { 
      ...useCase, 
      assignmentId: assignment.id, 
      dueDate: assignment.dueDate,
      assignmentComments: assignment.comments,
      assignedBy: assignment.fromUserId
    } : null;
  }).filter(Boolean);

  // Filter use cases that already have architecture designs
  const designedUseCases = Array.isArray(architectureDesigns) ?
    architectureDesigns.map((design: any) => design.useCaseId) : [];

  const pendingUseCases = assignedUseCases.filter((useCase: any) => 
    !designedUseCases.includes(useCase.id)
  );

  if (assignmentsLoading || useCasesLoading || designsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Architecture Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.fullName}</span>
              <Link href="/projects">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Projects
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <p className="text-gray-600">Review approved use cases and design system architecture</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned to Me</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedUseCases.length}</div>
              <p className="text-xs text-muted-foreground">
                Use cases assigned for architecture design
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Designed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Array.isArray(architectureDesigns) ? architectureDesigns.length : 0}</div>
              <p className="text-xs text-muted-foreground">
                Architecture designs completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Use Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Array.isArray(useCases) ? useCases.length : 0}</div>
              <p className="text-xs text-muted-foreground">
                All use cases in system
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assigned" className="space-y-6">
          <TabsList>
            <TabsTrigger value="assigned">Assigned to Me ({assignedUseCases.length})</TabsTrigger>
            <TabsTrigger value="design">Create Design</TabsTrigger>
            <TabsTrigger value="completed">Completed ({Array.isArray(architectureDesigns) ? architectureDesigns.length : 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Use Cases Assigned for Architecture Design</CardTitle>
                <CardDescription>
                  These use cases have been approved by Business Analysts and assigned to you for architecture design with sprint allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignedUseCases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No use cases assigned for architecture design</p>
                    <p className="text-sm mt-2">Use cases will appear here automatically when approved by Business Analysts</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {assignedUseCases.map((useCase: any) => (
                      <Card key={useCase.id} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedUseCase(useCase)}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{useCase.title}</CardTitle>
                            <Badge variant="secondary">{useCase.status}</Badge>
                          </div>
                          <CardDescription>
                            {useCase.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Priority: {useCase.priority}</span>
                            <span>Created: {new Date(useCase.createdAt).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design">
            <Card>
              <CardHeader>
                <CardTitle>Create Architecture Design</CardTitle>
                <CardDescription>
                  {selectedUseCase ? 
                    `Creating architecture design for: ${selectedUseCase.title}` :
                    'Select a use case from the Pending tab first'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedUseCase ? (
                  <Form {...architectureForm}>
                    <form onSubmit={architectureForm.handleSubmit(onSubmitDesign)} className="space-y-6">
                      <FormField
                        control={architectureForm.control}
                        name="systemOverview"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>System Overview</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Provide a high-level overview of the system architecture..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={architectureForm.control}
                        name="architecturalPattern"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Architectural Pattern</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select architectural pattern" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="microservices">Microservices</SelectItem>
                                <SelectItem value="monolithic">Monolithic</SelectItem>
                                <SelectItem value="serverless">Serverless</SelectItem>
                                <SelectItem value="event-driven">Event-Driven</SelectItem>
                                <SelectItem value="layered">Layered Architecture</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={architectureForm.control}
                        name="technologyStack"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Technology Stack</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., React, Node.js, PostgreSQL, Docker..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={architectureForm.control}
                        name="dataFlow"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Flow Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe how data flows through the system..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={architectureForm.control}
                        name="securityConsiderations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Security Considerations</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Outline security measures and considerations..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={architectureForm.control}
                        name="scalabilityPlan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scalability Plan</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe how the system will scale..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={architectureForm.control}
                        name="deploymentStrategy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deployment Strategy</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select deployment strategy" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="containerized">Containerized (Docker/K8s)</SelectItem>
                                <SelectItem value="cloud-native">Cloud Native</SelectItem>
                                <SelectItem value="traditional">Traditional Server</SelectItem>
                                <SelectItem value="serverless">Serverless Functions</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={createDesignMutation.isPending}
                        className="w-full"
                      >
                        {createDesignMutation.isPending ? "Creating..." : "Create Architecture Design"}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a use case from the Pending tab to create its architecture design</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Completed Architecture Designs</CardTitle>
                <CardDescription>
                  All architecture designs created by the team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Array.isArray(architectureDesigns) && architectureDesigns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No architecture designs completed yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {Array.isArray(architectureDesigns) && architectureDesigns.map((design: any) => (
                      <Card key={design.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              Use Case ID: {design.useCaseId}
                            </CardTitle>
                            <Badge variant="outline">{design.architecturalPattern}</Badge>
                          </div>
                          <CardDescription>
                            {design.systemOverview}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Technology Stack</h4>
                              <p className="text-sm text-gray-600">{design.technologyStack}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Deployment</h4>
                              <p className="text-sm text-gray-600">{design.deploymentStrategy}</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs text-gray-500">
                              Created: {new Date(design.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}