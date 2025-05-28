import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthModal } from "@/components/AuthModal";
import { StudentApp } from "@/components/StudentApp";
import { FacultyDashboard } from "@/components/FacultyDashboard";
import { authApi, isAuthenticated, removeAuthToken, getAuthToken } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";

export default function Home() {
  const [showAuth, setShowAuth] = useState(!isAuthenticated());
  const [currentView, setCurrentView] = useState<"student" | "faculty">("student");

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated(),
  });

  useEffect(() => {
    // If there's a token but user fetch fails, show auth
    if (isAuthenticated() && error) {
      removeAuthToken();
      setShowAuth(true);
    }
  }, [error]);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    // Refresh the page to get user data
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout error:", error);
    } finally {
      removeAuthToken();
      setShowAuth(true);
      setCurrentView("student");
    }
  };

  const handleOpenDashboard = () => {
    setCurrentView("faculty");
  };

  const handleCloseDashboard = () => {
    setCurrentView("student");
  };

  // Show loading state while checking authentication
  if (isAuthenticated() && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show auth modal if not authenticated or no user data
  if (showAuth || !user) {
    return <AuthModal isOpen={true} onSuccess={handleAuthSuccess} />;
  }

  // Show appropriate view based on current state
  if (currentView === "faculty") {
    return <FacultyDashboard onClose={handleCloseDashboard} />;
  }

  return (
    <StudentApp 
      user={user} 
      onLogout={handleLogout}
      onOpenDashboard={handleOpenDashboard}
    />
  );
}
