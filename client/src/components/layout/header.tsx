import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Code, Bell, ChevronDown, User, LogOut, Settings } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const [notifications] = useState(3); // Mock notification count

  const getRoleColor = (role: string) => {
    const colors = {
      ba: "bg-green-500",
      architect: "bg-orange-500",
      developer: "bg-purple-500",
      pm: "bg-red-500",
      devops: "bg-gray-500",
      uat: "bg-yellow-600",
      stakeholder: "bg-blue-500"
    };
    return colors[role as keyof typeof colors] || "bg-gray-500";
  };

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Code className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Smart SDLC</h1>
          </div>
          <div className="hidden md:flex items-center space-x-1 ml-8">
            <Badge variant="secondary" className="bg-primary text-white">
              Enterprise Edition
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={`${getRoleColor(user?.role || "")} text-white text-sm font-medium`}>
                    {getInitials(user?.fullName || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.fullName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {getRoleDisplayName(user?.role || "")}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-500">{user?.profile}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
