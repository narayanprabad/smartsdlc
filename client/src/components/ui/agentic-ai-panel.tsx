import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Send, 
  Loader2, 
  Globe, 
  Upload, 
  Download, 
  FileText,
  Lightbulb,
  Target,
  Zap,
  Workflow,
  Users,
  Clock
} from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  url?: string;
  requirementId?: number;
  showActions?: boolean;
}

interface AgenticAIPanelProps {
  onUseCaseGenerated?: () => void;
}

export function AgenticAIPanel({ onUseCaseGenerated }: AgenticAIPanelProps) {
  const [query, setQuery] = useState("");
  const [activeAgent, setActiveAgent] = useState<string>("use_case_generator");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'I\'m your Smart SDLC AI Agent. I can generate use cases, analyze requirements, create user stories, and help with project planning. Select an agent or ask me anything!',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const agents = [
    {
      id: "use_case_generator",
      name: "Use Case Generator",
      icon: Target,
      description: "Generate detailed use cases from requirements",
      prompt: "Generate comprehensive use cases with actors, goals, and acceptance criteria"
    },
    {
      id: "requirement_analyst",
      name: "Requirement Analyst", 
      icon: FileText,
      description: "Analyze and document requirements",
      prompt: "Analyze requirements and suggest improvements, gaps, and dependencies"
    },
    {
      id: "user_story_creator",
      name: "User Story Creator",
      icon: Users,
      description: "Create user stories from use cases",
      prompt: "Convert use cases into well-structured user stories with acceptance criteria"
    },
    {
      id: "workflow_optimizer",
      name: "Workflow Optimizer",
      icon: Workflow,
      description: "Optimize development workflows",
      prompt: "Analyze and optimize development workflows for efficiency and quality"
    },
    {
      id: "smart_planner",
      name: "Smart Planner",
      icon: Clock,
      description: "Create project timelines and estimates",
      prompt: "Create realistic project timelines with effort estimates and dependencies"
    },
    {
      id: "innovation_advisor",
      name: "Innovation Advisor",
      icon: Lightbulb,
      description: "Suggest innovative solutions",
      prompt: "Suggest innovative technical solutions and industry best practices"
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const aiQueryMutation = useMutation({
    mutationFn: async (message: string) => {
      const selectedAgent = agents.find(a => a.id === activeAgent);
      const enhancedMessage = selectedAgent 
        ? `${selectedAgent.prompt}: ${message}`
        : message;
      
      const response = await apiRequest("POST", "/api/ai/analyze-and-save", { 
        message: enhancedMessage,
        context: "smart_sdlc_agentic",
        agentType: activeAgent
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response || 'I processed your request successfully.',
        timestamp: new Date(),
        requirementId: data.requirement?.id,
        showActions: data.showActions
      }]);
      setIsLoading(false);
      if (onUseCaseGenerated) {
        onUseCaseGenerated();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases"] });
    },
    onError: (error) => {
      console.error('AI Query Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      }]);
      setIsLoading(false);
    }
  });

  const handleSendQuery = () => {
    if (!query.trim() && !uploadedFile) return;

    let messageContent = query.trim();
    if (uploadedFile) {
      messageContent += `\n[Uploaded file: ${uploadedFile.name}]`;
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    }]);

    setIsLoading(true);
    aiQueryMutation.mutate(messageContent);
    setQuery("");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "File uploaded",
        description: `${file.name} is ready for analysis`,
      });
    }
  };

  const handleExportRequirements = async () => {
    try {
      const response = await apiRequest("GET", "/api/requirements/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-sdlc-specification.md';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Requirements specification downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export requirements",
        variant: "destructive",
      });
    }
  };

  const selectedAgent = agents.find(a => a.id === activeAgent);

  return (
    <Card className="h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-indigo-200 shadow-xl flex flex-col">
      <CardHeader className="pb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center ring-2 ring-white/30">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">Smart SDLC AI Agent</CardTitle>
              <p className="text-indigo-100 text-sm font-medium">Intelligent Development Lifecycle Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Zap className="h-3 w-3 mr-1" />
              Online
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        {/* Agent Selection */}
        <div>
          <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            AI Agents
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {agents.map((agent) => {
              const IconComponent = agent.icon;
              return (
                <Button
                  key={agent.id}
                  variant={activeAgent === agent.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveAgent(agent.id)}
                  className={`justify-start h-auto p-2 transition-all duration-200 ${
                    activeAgent === agent.id 
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-md border-0" 
                      : "hover:bg-indigo-50 hover:border-indigo-300 border-gray-200"
                  }`}
                >
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                      activeAgent === agent.id 
                        ? "bg-white/20" 
                        : "bg-indigo-100"
                    }`}>
                      <IconComponent className={`h-3 w-3 ${
                        activeAgent === agent.id ? "text-white" : "text-indigo-600"
                      }`} />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-xs leading-tight">{agent.name}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
          {selectedAgent && (
            <p className="text-xs text-gray-600 mt-2 text-center">{selectedAgent.description}</p>
          )}
        </div>

        <Separator className="bg-indigo-100" />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center p-2 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200"
          >
            <Upload className="h-3 w-3 mr-1 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">Upload</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportRequirements}
            className="flex items-center justify-center p-2 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200"
          >
            <Download className="h-3 w-3 mr-1 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">Export</span>
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md"
        />

        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  {message.url && (
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <Badge variant="outline" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        URL Analyzed
                      </Badge>
                    </div>
                  )}
                  {message.requirementId && (
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Requirement #{message.requirementId}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">
                      {selectedAgent?.name} is processing...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* File Upload Indicator */}
        {uploadedFile && (
          <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-700">{uploadedFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadedFile(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-purple-200 pt-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder={`Ask ${selectedAgent?.name || 'AI Agent'} to help with your SDLC needs...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendQuery();
                  }
                }}
                className="min-h-[80px] max-h-[120px] resize-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>{query.length}/2000</span>
              </div>
            </div>
            <Button
              onClick={handleSendQuery}
              disabled={(!query.trim() && !uploadedFile) || isLoading}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-6 py-3"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}