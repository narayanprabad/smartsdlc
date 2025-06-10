import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileDown,
  UserCheck,
  History,
  Plus,
} from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      icon: FileDown,
      title: "Export Requirements",
      description: "Download comprehensive spec",
      color: "text-green-600",
      bgColor: "bg-green-100",
      action: () => console.log("Export requirements"),
    },
    {
      icon: UserCheck,
      title: "Assign to Architect",
      description: "Send for design review",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      action: () => console.log("Assign to architect"),
    },
    {
      icon: History,
      title: "View Audit Trail",
      description: "Track all changes",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      action: () => console.log("View audit trail"),
    },
    {
      icon: Plus,
      title: "Create New Project",
      description: "Start fresh analysis",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      action: () => console.log("Create new project"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start p-3 h-auto hover:shadow-md transition-shadow"
              onClick={action.action}
            >
              <div className={`w-8 h-8 ${action.bgColor} rounded-lg flex items-center justify-center mr-3`}>
                <Icon className={`${action.color} h-4 w-4`} />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 text-sm">
                  {action.title}
                </p>
                <p className="text-xs text-gray-600">
                  {action.description}
                </p>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
