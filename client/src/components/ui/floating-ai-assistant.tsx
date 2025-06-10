import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Minimize2,
  Maximize2,
  X
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

interface FloatingAIAssistantProps {
  onUseCaseGenerated?: () => void;
}

export function FloatingAIAssistant({ onUseCaseGenerated }: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'I can analyze URLs, documents, and help with requirements generation. Upload files or paste URLs to get started.',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      const response = await apiRequest("POST", "/api/ai/analyze-and-save", { 
        message,
        context: "smart_sdlc"
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response || 'I received your message but encountered an issue processing it. Please try again.',
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
        content: 'I apologize, but I encountered an error processing your request. Please ensure the AI service is properly configured and try again.',
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
      a.download = 'requirements-specification.md';
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

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg"
        >
          <Bot className="h-6 w-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-12' : 'w-96 h-[600px]'
    }`}>
      <Card className="h-full bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 flex flex-col shadow-2xl">
        <CardHeader className="pb-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <CardTitle className="text-sm text-gray-900">Smart SDLC AI</CardTitle>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="flex-1 flex flex-col p-3 space-y-3">
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportRequirements}
                className="flex-1"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
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
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                          : 'bg-white border shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
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
                    <div className="bg-white border shadow-sm rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-sm text-gray-600">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* File Upload Indicator */}
            {uploadedFile && (
              <div className="bg-purple-100 border border-purple-200 rounded-lg p-2">
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
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-purple-200 pt-3">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Paste URL, ask questions, or upload files..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendQuery();
                      }
                    }}
                    className="min-h-[50px] max-h-[100px] resize-none text-sm"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleSendQuery}
                  disabled={(!query.trim() && !uploadedFile) || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-4"
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}