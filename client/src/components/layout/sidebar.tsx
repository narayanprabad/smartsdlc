import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Folder } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = location === "/projects" || location === "/" || location === "/dashboard";

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
      <nav className="p-4">
        <div className="space-y-1">
          <Link href="/projects">
            <a
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-green-100 text-green-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Folder className="h-5 w-5" />
              <span>Projects</span>
            </a>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
