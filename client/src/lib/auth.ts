import { apiRequest } from "./queryClient";

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
