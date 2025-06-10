import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DocumentUpload } from "@/components/dashboard/document-upload";
import { RecentUseCases } from "@/components/dashboard/recent-use-cases";
import { AIAssistant } from "@/components/dashboard/ai-assistant";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Plus } from "lucide-react";
import { UploadModal } from "@/components/modals/upload-modal";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const handleOpenUploadModal = () => {
      setShowUploadModal(true);
    };

    window.addEventListener("openUploadModal", handleOpenUploadModal);
    return () => {
      window.removeEventListener("openUploadModal", handleOpenUploadModal);
    };
  }, []);

  const getRoleDisplayName = (role: string) => {
    const names = {
      ba: "Business Analyst",
      architect: "Solution Architect", 
      developer: "Developer",
      pm: "Project Manager",
      devops: "DevOps Engineer",
      uat: "UAT Tester",
      stakeholder: "Stakeholder"
    };
    return names[role as keyof typeof names] || role;
  };

  const getRoleModules = (role: string) => {
    const modules = [
      {
        role: "architect",
        title: "Solution Architect",
        description: "Create system diagrams, define architecture patterns, and design technical solutions.",
        assignments: "12 assignments pending",
        color: "bg-orange-500",
        accent: "text-orange-600"
      },
      {
        role: "developer", 
        title: "Developer",
        description: "Access sprint tasks, generate code scaffolding, and track development progress.",
        assignments: "8 user stories active",
        color: "bg-purple-500",
        accent: "text-purple-600"
      },
      {
        role: "pm",
        title: "Project Manager", 
        description: "Manage sprints, assign tasks, track progress, and coordinate between teams.",
        assignments: "3 sprints running",
        color: "bg-red-500",
        accent: "text-red-600"
      }
    ];

    return modules.filter(module => module.role !== role);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 ml-64 pt-16 p-6">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.fullName?.split(' ')[0] || 'User'}!
                </h2>
                <p className="text-gray-600 mt-1">
                  Here's what's happening with your projects today.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  onClick={() => console.log("Toggle AI Assistant")}
                >
                  <Bot className="mr-2 h-4 w-4" />
                  AI Assistant
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Analysis
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <StatsCards />

          {/* Main Content Grid - AI Assistant Prominent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AI Assistant - Full Height, Prominent */}
            <div className="lg:row-span-2">
              <AIAssistant />
            </div>

            {/* Right Column - Other Components */}
            <div className="space-y-6">
              <DocumentUpload />
              <QuickActions />
            </div>
          </div>

          {/* Secondary Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentUseCases />
            <ActivityFeed />
          </div>

          {/* Role-specific Module Previews */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Other Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getRoleModules(user?.role || "").map((module) => (
                <Card 
                  key={module.role}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => console.log(`Switch to ${module.role}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 ${module.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                        <div className={`w-5 h-5 ${module.color} rounded`}></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{module.title}</h4>
                        <p className="text-sm text-gray-600">
                          {module.role === "architect" ? "Design & Architecture" :
                           module.role === "developer" ? "Implementation & Code" :
                           "Planning & Coordination"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {module.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${module.accent} font-medium`}>
                        {module.assignments}
                      </span>
                      <span className="text-gray-400">→</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  );
}
