import { useEffect, useState } from "react";
import { User } from "@/lib/auth";
import { StudentApp } from "./StudentApp";

interface RoleBasedRouterProps {
  user: User;
  onLogout: () => void;
}

export function RoleBasedRouter({ user, onLogout }: RoleBasedRouterProps) {
  if (user.role === "faculty") {
    return null; // Faculty dashboard will be handled by the FacultyDashboard component directly
  }

  return (
    <StudentApp
      user={user}
      onLogout={onLogout}
    />
  );
}
