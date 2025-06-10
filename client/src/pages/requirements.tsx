import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  CheckCircle, 
  Download, 
  UserCheck, 
  Target, 
  Clock, 
  User,
  ExternalLink,
  Plus,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Requirement {
  id: number;
  title: string;
  content: string;
  status: string;
  version: number;
  sourceUrl?: string;
  projectId?: number;
  createdAt: Date;
  acceptedAt?: Date;
  acceptedBy?: number;
  assignedPmId?: number;
  metadata?: any;
}

export default function RequirementsPage() {
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch requirements
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['/api/requirements'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/requirements", {});
      return response.json();
    }
  });

  // Fetch project managers
  const { data: projectManagers = [] } = useQuery({
    queryKey: ['/api/users/project-managers'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users/project-managers", {});
      return response.json();
    }
  });

  // Create requirement mutation
  const createRequirementMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await apiRequest("POST", "/api/requirements", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Requirement Created",
        description: "New requirement has been created successfully"
      });
      setNewTitle("");
      setNewContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/requirements'] });
    }
  });

  // Accept requirement mutation
  const acceptRequirementMutation = useMutation({
    mutationFn: async (requirementId: number) => {
      const response = await apiRequest("PATCH", `/api/requirements/${requirementId}/accept`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Requirement Accepted",
        description: "Requirements have been frozen and accepted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requirements'] });
    }
  });

  // Generate deliverables mutation
  const generateDeliverablesMutation = useMutation({
    mutationFn: async (requirementId: number) => {
      const response = await apiRequest("POST", `/api/requirements/${requirementId}/generate-deliverables`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deliverables Generated",
        description: `Generated ${data.totalCount} deliverables for Jira import`
      });
    }
  });

  // Assign to PM mutation
  const assignToPMMutation = useMutation({
    mutationFn: async ({ requirementId, pmId }: { requirementId: number; pmId: number }) => {
      const response = await apiRequest("PATCH", `/api/requirements/${requirementId}/assign-pm`, { pmId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assigned to Project Manager",
        description: "Requirement has been assigned to a Project Manager"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requirements'] });
    }
  });

  // Export to PDF mutation
  const exportToPDFMutation = useMutation({
    mutationFn: async (requirementId: number) => {
      const response = await apiRequest("GET", `/api/requirements/${requirementId}/export`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Export Ready",
        description: "Requirements document is ready for download"
      });
      console.log('PDF Export Data:', data);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return <Badge variant="secondary" className="text-xs">Draft</Badge>;
      case 'accepted':
        return <Badge variant="default" className="text-xs bg-green-500">Accepted</Badge>;
      case 'assigned':
        return <Badge variant="default" className="text-xs bg-blue-500">Assigned</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Requirements</h1>
          <p className="text-gray-600 mt-1">Manage and track your project requirements</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {requirements.length} Total Requirements
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requirements List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Requirements</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Create New Requirement */}
              <div className="space-y-3 mb-6">
                <Input
                  placeholder="Requirement title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Requirement content..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={() => createRequirementMutation.mutate({ title: newTitle, content: newContent })}
                  disabled={!newTitle.trim() || !newContent.trim() || createRequirementMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Requirement
                </Button>
              </div>

              <Separator className="mb-4" />

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="text-center text-gray-500 py-8">Loading requirements...</div>
                  ) : requirements.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No requirements found
                    </div>
                  ) : (
                    requirements.map((requirement: Requirement) => (
                      <div
                        key={requirement.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRequirement?.id === requirement.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedRequirement(requirement)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                            {requirement.title}
                          </h4>
                          {getStatusBadge(requirement.status)}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(requirement.createdAt)}</span>
                          {requirement.sourceUrl && (
                            <ExternalLink className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Requirement Details */}
        <div className="lg:col-span-2">
          {selectedRequirement ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedRequirement.title}</CardTitle>
                    <div className="flex items-center space-x-3 mt-2">
                      {getStatusBadge(selectedRequirement.status)}
                      <span className="text-sm text-gray-500">Version {selectedRequirement.version}</span>
                      {selectedRequirement.sourceUrl && (
                        <a 
                          href={selectedRequirement.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-sm flex items-center space-x-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Source</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Action Buttons */}
                <div className="mb-6">
                  <div className="flex gap-3">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => acceptRequirementMutation.mutate(selectedRequirement.id)}
                      disabled={acceptRequirementMutation.isPending || selectedRequirement.status === 'accepted'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {selectedRequirement.status === 'accepted' ? 'Accepted' : 'Accept'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateDeliverablesMutation.mutate(selectedRequirement.id)}
                      disabled={generateDeliverablesMutation.isPending}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Create Tasks
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportToPDFMutation.mutate(selectedRequirement.id)}
                      disabled={exportToPDFMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {selectedRequirement.content}
                  </div>
                </div>

                {/* Metadata */}
                {selectedRequirement.metadata && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">Metadata:</div>
                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                      <pre>{JSON.stringify(selectedRequirement.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[500px]">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a requirement to view details and manage workflow</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}