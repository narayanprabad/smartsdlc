import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Folder, List, Clock, FileText } from "lucide-react";

export function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const statItems = [
    {
      title: "Active Projects",
      value: stats?.activeProjects || 0,
      icon: Folder,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+2",
      changeText: "from last week",
    },
    {
      title: "Use Cases Generated",
      value: stats?.useCases || 0,
      icon: List,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: "+15",
      changeText: "this week",
    },
    {
      title: "Pending Reviews",
      value: stats?.pendingReviews || 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      change: "2 urgent",
      changeText: "need attention",
      isUrgent: true,
    },
    {
      title: "Documents Processed",
      value: stats?.documentsProcessed || 0,
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      change: "100%",
      changeText: "success rate",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    {item.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {item.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${item.color} h-6 w-6`} />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <span
                  className={`font-medium ${
                    item.isUrgent ? "text-orange-600" : "text-green-600"
                  }`}
                >
                  {item.change}
                </span>
                <span className="text-gray-600 ml-1">{item.changeText}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
