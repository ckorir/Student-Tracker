import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, setAuthToken } from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onSuccess }: AuthModalProps) {
  const [username, setUsername] = useState("STU12345");
  const [password, setPassword] = useState("password123");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => {
      setAuthToken(data.token);
      toast({
        title: "Welcome back!",
        description: `Signed in as ${data.user.name}`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Welcome to Smart Attendance</DialogTitle>
          <p className="text-center text-muted-foreground">Sign in to mark your attendance</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Student ID</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your student ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing In..." : "Sign In"}
          </Button>
        </form>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Demo credentials:</p>
          <p>Student: STU12345 / password123</p>
          <p>Faculty: FAC001 / faculty123</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
