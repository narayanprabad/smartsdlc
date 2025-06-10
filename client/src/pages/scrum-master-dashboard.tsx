import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Target, 
  CheckCircle, 
  Clock,
  Palette,
  Monitor,
  Smartphone,
  Tablet,
  Layout,
  Zap
} from "lucide-react";

const uiDesignerAllocationSchema = z.object({
  designerId: z.string().min(1, "Designer selection is required"),
  uiComplexity: z.enum(["simple", "moderate", "complex", "advanced"]),
  designScope: z.array(z.string()).min(1, "At least one design scope is required"),
  estimatedDesignHours: z.number().min(1, "Estimated hours must be at least 1"),
  designDeadline: z.string().min(1, "Deadline is required"),
  designRequirements: z.string().min(10, "Design requirements are required"),
  platformTargets: z.array(z.string()).min(1, "At least one platform target is required"),
  designAssets: z.string().optional(),
  brandingGuidelines: z.string().optional(),
  userPersonas: z.string().optional(),
});

type UIDesignerAllocationData = z.infer<typeof uiDesignerAllocationSchema>;

export default function ScrumMasterDashboard() {
  const [selectedUseCase, setSelectedUseCase] = useState<any>(null);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch approved use cases for UI designer allocation
  const { data: approvedUseCases, isLoading } = useQuery({
    queryKey: ["/api/use-cases", "approved"],
    queryFn: () => apiRequest("/api/use-cases?status=approved"),
  });

  // Fetch available UI designers
  const { data: uiDesigners } = useQuery({
    queryKey: ["/api/users", "ui_designers"],
    queryFn: () => apiRequest("/api/users?role=ui_designer"),
  });

  // Fetch existing UI allocations
  const { data: uiAllocations } = useQuery({
    queryKey: ["/api/ui-allocations"],
    queryFn: () => apiRequest("/api/ui-allocations"),
  });

  // Fetch sprint data
  const { data: sprints } = useQuery({
    queryKey: ["/api/sprints"],
    queryFn: () => apiRequest("/api/sprints"),
  });

  const allocationForm = useForm<UIDesignerAllocationData>({
    resolver: zodResolver(uiDesignerAllocationSchema),
    defaultValues: {
      designerId: "",
      uiComplexity: "moderate",
      designScope: [],
      estimatedDesignHours: 40,
      designDeadline: "",
      designRequirements: "",
      platformTargets: [],
      designAssets: "",
      brandingGuidelines: "",
      userPersonas: "",
    },
  });

  const createUIAllocationMutation = useMutation({
    mutationFn: (data: UIDesignerAllocationData & { useCaseId: number }) => {
      return apiRequest("/api/ui-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ui-allocations"] });
      toast({ title: "UI Designer allocated successfully" });
      setAllocationDialogOpen(false);
      setSelectedUseCase(null);
      allocationForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to allocate UI Designer", variant: "destructive" });
    },
  });

  const createSprintMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sprints"] });
      toast({ title: "Sprint created successfully" });
      setSprintDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create sprint", variant: "destructive" });
    },
  });

  const handleAllocateDesigner = (useCase: any) => {
    setSelectedUseCase(useCase);
    setAllocationDialogOpen(true);
  };

  const onSubmitAllocation = (data: UIDesignerAllocationData) => {
    if (!selectedUseCase) return;
    createUIAllocationMutation.mutate({
      ...data,
      useCaseId: selectedUseCase.id,
    });
  };

  const requiresUI = (useCase: any) => {
    const uiKeywords = ['interface', 'ui', 'dashboard', 'form', 'screen', 'page', 'display', 'view', 'portal', 'frontend'];
    const description = useCase.description?.toLowerCase() || '';
    const title = useCase.title?.toLowerCase() || '';
    return uiKeywords.some(keyword => description.includes(keyword) || title.includes(keyword));
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-blue-100 text-blue-800';
      case 'complex': return 'bg-orange-100 text-orange-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading Scrum Master dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Scrum Master Dashboard</h1>
          </div>
          <p className="text-gray-600">Manage UI designer allocations and sprint planning</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-orange-500" />
                Pending UI Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {approvedUseCases?.filter((uc: any) => requiresUI(uc)).length || 0}
              </div>
              <p className="text-sm text-gray-500">Use cases needing UI</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-blue-500" />
                UI Designers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {uiDesigners?.length || 0}
              </div>
              <p className="text-sm text-gray-500">Available designers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Allocations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {uiAllocations?.length || 0}
              </div>
              <p className="text-sm text-gray-500">UI tasks allocated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-indigo-500" />
                Active Sprints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {sprints?.filter((s: any) => s.status === 'active').length || 0}
              </div>
              <p className="text-sm text-gray-500">Current sprints</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Use Cases Requiring UI */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Use Cases Requiring UI
              </h2>
              <Button onClick={() => setSprintDialogOpen(true)} size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Plan Sprint
              </Button>
            </div>
            <div className="space-y-4">
              {approvedUseCases && approvedUseCases.filter((uc: any) => requiresUI(uc)).length > 0 ? (
                approvedUseCases.filter((uc: any) => requiresUI(uc)).map((useCase: any) => (
                  <Card key={useCase.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium text-lg">{useCase.title}</h3>
                        <div className="flex gap-1">
                          <Badge variant={useCase.priority === 'high' || useCase.priority === 'critical' ? 'destructive' : 'secondary'}>
                            {useCase.priority}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            UI Required
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{useCase.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                        {useCase.description?.toLowerCase().includes('dashboard') && (
                          <span className="flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            Dashboard
                          </span>
                        )}
                        {useCase.description?.toLowerCase().includes('mobile') && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            Mobile
                          </span>
                        )}
                        {useCase.description?.toLowerCase().includes('form') && (
                          <span className="flex items-center gap-1">
                            <Layout className="h-3 w-3" />
                            Forms
                          </span>
                        )}
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => handleAllocateDesigner(useCase)}
                        className="flex items-center gap-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        Allocate UI Designer
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No approved use cases requiring UI work</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* UI Allocations */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              UI Designer Allocations
            </h2>
            <div className="space-y-4">
              {uiAllocations && uiAllocations.length > 0 ? (
                uiAllocations.map((allocation: any) => (
                  <Card key={allocation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium">{allocation.title || `UI Design for Use Case #${allocation.useCaseId}`}</h3>
                        <Badge className={getComplexityColor(allocation.uiComplexity)}>
                          {allocation.uiComplexity}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          {allocation.designerName || 'Designer TBD'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {allocation.estimatedDesignHours}h
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {allocation.platformTargets?.map((platform: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {platform === 'web' && <Monitor className="h-3 w-3 mr-1" />}
                            {platform === 'mobile' && <Smartphone className="h-3 w-3 mr-1" />}
                            {platform === 'tablet' && <Tablet className="h-3 w-3 mr-1" />}
                            {platform}
                          </Badge>
                        ))}
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">{allocation.designRequirements}</p>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        Deadline: {new Date(allocation.designDeadline).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No UI designer allocations yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* UI Designer Allocation Dialog */}
        <Dialog open={allocationDialogOpen} onOpenChange={setAllocationDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Allocate UI Designer</DialogTitle>
            </DialogHeader>
            <Form {...allocationForm}>
              <form onSubmit={allocationForm.handleSubmit(onSubmitAllocation)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={allocationForm.control}
                    name="designerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UI Designer</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select designer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uiDesigners?.map((designer: any) => (
                              <SelectItem key={designer.id} value={designer.id.toString()}>
                                {designer.fullName} - {designer.profile || 'UI Designer'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={allocationForm.control}
                    name="uiComplexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UI Complexity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select complexity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="simple">Simple</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="complex">Complex</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={allocationForm.control}
                    name="estimatedDesignHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Design Hours</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="40" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={allocationForm.control}
                    name="designDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Design Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={allocationForm.control}
                  name="designRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Design Requirements</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detailed UI/UX requirements and specifications" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAllocationDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUIAllocationMutation.isPending}>
                    {createUIAllocationMutation.isPending ? "Allocating..." : "Allocate Designer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}