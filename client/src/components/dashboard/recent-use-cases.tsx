import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, User, Calendar, FileText, Eye } from "lucide-react";
import { Link } from "wouter";

export function RecentUseCases() {
  const { data: useCases, isLoading } = useQuery({
    queryKey: ["/api/use-cases"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_review":
        return "bg-orange-100 text-orange-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "assigned":
        return "bg-green-100 text-green-800";
      case "in_development":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending_review":
        return "Pending Review";
      case "approved":
        return "Approved";
      case "assigned":
        return "Assigned to Architect";
      case "in_development":
        return "In Development";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Use Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-3 h-3 bg-gray-200 rounded-full mt-2"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentUseCases = useCases?.slice(0, 3) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Use Cases</CardTitle>
          <Link href="/use-cases">
            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentUseCases.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No use cases yet</p>
            <Button>Create Your First Use Case</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {recentUseCases.map((useCase: any) => (
              <div
                key={useCase.id}
                className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {useCase.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {useCase.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          {useCase.actors?.join(", ") || "No actors"}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatTimeAgo(useCase.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <FileText className="mr-1 h-3 w-3" />
                          Source Document
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Badge className={getStatusColor(useCase.status)}>
                        {getStatusText(useCase.status)}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
