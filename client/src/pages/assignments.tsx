import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckSquare, 
  Clock, 
  Plus, 
  Search, 
  Calendar,
  User,
  MessageSquare,
  Check,
  X,
  ArrowRight
} from "lucide-react";

const createAssignmentSchema = z.object({
  type: z.enum(["use_case", "architecture", "development", "testing"]),
  entityId: z.number(),
  toUserId: z.number().optional(),
  toGroup: z.string().optional(),
  comments: z.string().optional(),
  dueDate: z.string().optional(),
});

type CreateAssignmentData = z.infer<typeof createAssignmentSchema>;

export default function Assignments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("received");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["/api/assignments"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: useCases } = useQuery({
    queryKey: ["/api/use-cases"],
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data: CreateAssignmentData) => apiRequest("POST", "/api/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setCreateDialogOpen(false);
      toast({
        title: "Assignment created",
        description: "The assignment has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Assignment updated",
        description: "The assignment status has been updated.",
      });
    },
  });

  const form = useForm<CreateAssignmentData>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      type: "use_case",
      comments: "",
    },
  });

  const onSubmit = (data: CreateAssignmentData) => {
    createAssignmentMutation.mutate({
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "use_case":
        return "bg-green-100 text-green-800";
      case "architecture":
        return "bg-orange-100 text-orange-800";
      case "development":
        return "bg-purple-100 text-purple-800";
      case "testing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAccept = (assignmentId: number) => {
    updateAssignmentMutation.mutate({
      id: assignmentId,
      data: { status: "accepted" }
    });
  };

  const handleReject = (assignmentId: number) => {
    updateAssignmentMutation.mutate({
      id: assignmentId,
      data: { status: "rejected" }
    });
  };

  const handleComplete = (assignmentId: number) => {
    updateAssignmentMutation.mutate({
      id: assignmentId,
      data: { status: "completed" }
    });
  };

  const filteredAssignments = assignments?.filter((assignment: any) => {
    const matchesSearch = assignment.comments?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const receivedAssignments = filteredAssignments.filter((a: any) => a.toUserId);
  const sentAssignments = filteredAssignments.filter((a: any) => a.fromUserId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 ml-64 pt-16 p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
                <p className="text-gray-600 mt-1">
                  Manage and track task assignments across your team.
                </p>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Assignment</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assignment Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="use_case">Use Case</SelectItem>
                                  <SelectItem value="architecture">Architecture</SelectItem>
                                  <SelectItem value="development">Development</SelectItem>
                                  <SelectItem value="testing">Testing</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="entityId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Related Item</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select item" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {useCases?.map((useCase: any) => (
                                    <SelectItem key={useCase.id} value={useCase.id.toString()}>
                                      {useCase.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="toUserId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign to User</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map((user: any) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.fullName} ({user.role})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="toGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Or Assign to Group</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Architecture Team, Development Team" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="comments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comments</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Add any specific instructions or notes"
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
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
                          disabled={createAssignmentMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assignments..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignments Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="received">
                Received ({receivedAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent ({sentAssignments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="mr-2 h-5 w-5" />
                    Assignments Received
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                              <div className="h-3 bg-gray-200 rounded w-full"></div>
                              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : receivedAssignments.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No assignments received
                      </h3>
                      <p className="text-gray-600">
                        You don't have any assignments at the moment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {receivedAssignments.map((assignment: any) => (
                        <div
                          key={assignment.id}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getTypeColor(assignment.type)}>
                                  {assignment.type.replace("_", " ")}
                                </Badge>
                                <Badge className={getStatusColor(assignment.status)}>
                                  {assignment.status}
                                </Badge>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-2">
                                Assignment ID: {assignment.id}
                              </h4>
                              {assignment.comments && (
                                <p className="text-sm text-gray-600 mb-3">
                                  {assignment.comments}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <User className="mr-1 h-3 w-3" />
                                  From: System
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {formatDate(assignment.createdAt)}
                                </span>
                                {assignment.dueDate && (
                                  <span className="flex items-center text-orange-600">
                                    <Clock className="mr-1 h-3 w-3" />
                                    Due: {formatDate(assignment.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {assignment.status === "pending" && (
                                <>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => handleAccept(assignment.id)}
                                    disabled={updateAssignmentMutation.isPending}
                                  >
                                    <Check className="mr-1 h-3 w-3" />
                                    Accept
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => handleReject(assignment.id)}
                                    disabled={updateAssignmentMutation.isPending}
                                  >
                                    <X className="mr-1 h-3 w-3" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {assignment.status === "accepted" && (
                                <Button 
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleComplete(assignment.id)}
                                  disabled={updateAssignmentMutation.isPending}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sent" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    Assignments Sent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sentAssignments.length === 0 ? (
                    <div className="text-center py-12">
                      <ArrowRight className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No assignments sent
                      </h3>
                      <p className="text-gray-600 mb-4">
                        You haven't created any assignments yet.
                      </p>
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Assignment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentAssignments.map((assignment: any) => (
                        <div
                          key={assignment.id}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getTypeColor(assignment.type)}>
                                  {assignment.type.replace("_", " ")}
                                </Badge>
                                <Badge className={getStatusColor(assignment.status)}>
                                  {assignment.status}
                                </Badge>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-2">
                                Assignment ID: {assignment.id}
                              </h4>
                              {assignment.comments && (
                                <p className="text-sm text-gray-600 mb-3">
                                  {assignment.comments}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <User className="mr-1 h-3 w-3" />
                                  To: {assignment.toGroup || "User"}
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {formatDate(assignment.createdAt)}
                                </span>
                                {assignment.dueDate && (
                                  <span className="flex items-center">
                                    <Clock className="mr-1 h-3 w-3" />
                                    Due: {formatDate(assignment.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
