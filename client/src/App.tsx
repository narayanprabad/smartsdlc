import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth.tsx";
import Login from "./pages/login";
import UseCases from "./pages/use-cases";
import Projects from "./pages/projects";
import ArchitectDashboard from "./pages/architect-dashboard";
import ScrumMasterDashboard from "./pages/scrum-master-dashboard";
import NotFound from "./pages/not-found";
import { useAuth } from "./hooks/use-auth";
import { useEffect } from "react";

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Force scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Role-based routing
  if (user.role === 'architect') {
    return (
      <Switch>
        <Route path="/" component={ArchitectDashboard} />
        <Route path="/architect" component={ArchitectDashboard} />
        <Route path="/use-cases" component={UseCases} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id/use-cases" component={UseCases} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (user.role === 'scrum_master') {
    return (
      <Switch>
        <Route path="/" component={ScrumMasterDashboard} />
        <Route path="/scrum" component={ScrumMasterDashboard} />
        <Route path="/use-cases" component={UseCases} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id/use-cases" component={UseCases} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Default routing for other roles
  return (
    <Switch>
      <Route path="/" component={Projects} />
      <Route path="/projects" component={Projects} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/projects/:id/use-cases" component={UseCases} />
      <Route path="/architect" component={ArchitectDashboard} />
      <Route path="/scrum" component={ScrumMasterDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ProtectedRoutes />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
