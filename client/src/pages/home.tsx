import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthModal } from "@/components/AuthModal";
import { StudentApp } from "@/components/StudentApp";
import { FacultyDashboard } from "@/components/FacultyDashboard";
import { authApi, isAuthenticated, removeAuthToken, getAuthToken, User } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";

export default function Home() {
  const [showAuth, setShowAuth] = useState(!isAuthenticated());
  const [currentView, setCurrentView] = useState<"student" | "faculty">("student");

  const { data: userData, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated(),
  });

  const user = userData as User | null;

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

  if (showAuth) {
    return <AuthModal isOpen={showAuth} onSuccess={handleAuthSuccess} />;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      {user.role === "faculty" ? (
        <FacultyDashboard user={user} onLogout={handleLogout} />
      ) : (
        <StudentApp user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
