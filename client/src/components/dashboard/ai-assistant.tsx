import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, Lightbulb, AlertCircle, Link, User, Loader2, Globe, FileText, Target, Settings, Users, Database, Shield, CheckCircle, Download, UserCheck, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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



export function AIAssistant() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can analyze URLs to generate comprehensive requirements specifications. Just paste a URL or ask me about software development.',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
    },
    onError: (error) => {
      console.error('AI Query Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. This might be because the AI service needs to be configured. Please try again or contact support.',
        timestamp: new Date(),
      }]);
      setIsLoading(false);
    }
  });

  // Mutation for accepting requirements
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

  // Mutation for generating deliverables
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

  // Mutation for assigning to PM
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
    }
  });

  // Mutation for exporting to PDF
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
      // In a real implementation, this would trigger a file download
      console.log('PDF Export Data:', data);
    }
  });

  const handleSendQuery = () => {
    if (!query.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    const urls = detectUrls(query);
    if (urls.length > 0) {
      userMessage.url = urls[0];
    }

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Call AI API
    aiQueryMutation.mutate(query);
    setQuery("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <Card className="h-[600px] bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg text-gray-900">Smart SDLC AI Assistant</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            <Globe className="h-3 w-3 mr-1" />
            URL Parsing Enabled
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-3">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4">
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
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      {message.url && (
                        <div className="flex items-center space-x-1 mb-2 opacity-75">
                          <Link className="h-3 w-3" />
                          <span className="text-xs truncate">{message.url}</span>
                        </div>
                      )}
                      <div className={`text-sm leading-relaxed ${
                        message.role === 'user' ? 'text-white' : 'text-gray-700'
                      }`}>
                        {message.role === 'assistant' ? (
                          <div className="space-y-1">
                            {message.content.split('\n').map((line, idx) => {
                              const trimmedLine = line.trim();
                              
                              if (!trimmedLine) return <div key={idx} className="h-2" />;
                              
                              // Headers with icons
                              if (trimmedLine.startsWith('## 🎯')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Target className="h-4 w-4 text-green-600" />
                                    <h3 className="font-semibold text-green-700">{trimmedLine.replace('## 🎯', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## 🏗️')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Settings className="h-4 w-4 text-blue-600" />
                                    <h3 className="font-semibold text-blue-700">{trimmedLine.replace('## 🏗️', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## 📋')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <FileText className="h-4 w-4 text-purple-600" />
                                    <h3 className="font-semibold text-purple-700">{trimmedLine.replace('## 📋', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## 🔧')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Settings className="h-4 w-4 text-orange-600" />
                                    <h3 className="font-semibold text-orange-700">{trimmedLine.replace('## 🔧', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## ⚡')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Shield className="h-4 w-4 text-red-600" />
                                    <h3 className="font-semibold text-red-700">{trimmedLine.replace('## ⚡', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## 📊')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Database className="h-4 w-4 text-cyan-600" />
                                    <h3 className="font-semibold text-cyan-700">{trimmedLine.replace('## 📊', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## 🔗')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Link className="h-4 w-4 text-indigo-600" />
                                    <h3 className="font-semibold text-indigo-700">{trimmedLine.replace('## 🔗', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## ✅')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Target className="h-4 w-4 text-green-600" />
                                    <h3 className="font-semibold text-green-700">{trimmedLine.replace('## ✅', '').trim()}</h3>
                                  </div>
                                );
                              }
                              if (trimmedLine.startsWith('## 📈')) {
                                return (
                                  <div key={idx} className="flex items-center space-x-2 mt-4 mb-2">
                                    <Target className="h-4 w-4 text-emerald-600" />
                                    <h3 className="font-semibold text-emerald-700">{trimmedLine.replace('## 📈', '').trim()}</h3>
                                  </div>
                                );
                              }
                              
                              // Use case headers
                              if (trimmedLine.startsWith('### UC-')) {
                                return (
                                  <div key={idx} className="bg-purple-50 border-l-4 border-purple-400 p-3 mt-3 mb-2">
                                    <h4 className="font-medium text-purple-800">{trimmedLine.replace('###', '').trim()}</h4>
                                  </div>
                                );
                              }
                              
                              // Subsection headers
                              if (trimmedLine.startsWith('### ')) {
                                return <h4 key={idx} className="font-medium text-gray-800 mt-3 mb-1">{trimmedLine.replace('###', '').trim()}</h4>;
                              }
                              
                              // Bold text
                              if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                                return <p key={idx} className="font-medium text-gray-800 mt-1">{trimmedLine.replace(/\*\*/g, '')}</p>;
                              }
                              
                              // Lists
                              if (trimmedLine.startsWith('- ')) {
                                return (
                                  <div key={idx} className="flex items-start space-x-2 ml-4 mt-1">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-gray-700 text-sm">{trimmedLine.replace('- ', '')}</p>
                                  </div>
                                );
                              }
                              
                              // Numbered lists
                              if (/^\d+\./.test(trimmedLine)) {
                                return (
                                  <div key={idx} className="flex items-start space-x-2 ml-4 mt-1">
                                    <span className="text-purple-600 font-medium text-sm">{trimmedLine.match(/^\d+/)?.[0]}.</span>
                                    <p className="text-gray-700 text-sm">{trimmedLine.replace(/^\d+\.\s*/, '')}</p>
                                  </div>
                                );
                              }
                              
                              // Regular paragraphs
                              return <p key={idx} className="text-gray-700 text-sm leading-relaxed mt-1">{trimmedLine}</p>;
                            })}
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                      
                      {/* Action buttons for requirements workflow */}
                      {message.showActions && message.requirementId && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="text-xs h-8 bg-green-600 hover:bg-green-700"
                              onClick={() => acceptRequirementMutation.mutate(message.requirementId!)}
                              disabled={acceptRequirementMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8"
                              onClick={() => generateDeliverablesMutation.mutate(message.requirementId!)}
                              disabled={generateDeliverablesMutation.isPending}
                            >
                              <Target className="h-3 w-3 mr-1" />
                              Create Tasks
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8"
                              onClick={() => exportToPDFMutation.mutate(message.requirementId!)}
                              disabled={exportToPDFMutation.isPending}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <p className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-purple-100' : 'text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-lg px-4 py-3 max-w-[85%]">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-purple-500" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-purple-200 pt-3">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Ask me anything about your SDLC process, paste a URL to analyze, or request help with requirements..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendQuery();
                  }
                }}
                className="min-h-[60px] max-h-[120px] resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>{query.length}/2000</span>
              </div>
            </div>
            <Button
              onClick={handleSendQuery}
              disabled={!query.trim() || isLoading}
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
