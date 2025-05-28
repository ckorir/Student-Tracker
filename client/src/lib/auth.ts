import { apiRequest } from "./queryClient";
import { Room } from "@shared/schema";

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  deviceId?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiRequest("POST", "/api/auth/login", { username, password });
    return response.json();
  },

  logout: async (): Promise<void> => {
    await apiRequest("POST", "/api/auth/logout");
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },

  getRooms: async (): Promise<Room[]> => {
    const response = await apiRequest("GET", "/api/rooms");
    return response.json();
  },

  markAttendance: async (data: { roomId: string; status: string }): Promise<void> => {
    await apiRequest("POST", "/api/attendance", data);
  },
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("attendance_token");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("attendance_token", token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("attendance_token");
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
