import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type User, type InsertUser } from "@shared/schema";
import { api, loginSchema } from "@shared/routes";
import { z } from "zod";
import { useLocation } from "wouter";
import toast from "react-hot-toast";
import { API_BASE } from "@/lib/api";

// Custom error class to preserve HTTP status codes from API responses
class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = InsertUser & { facultySecret?: string };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function useLoginMutation() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginData) => {

      const res = await fetch(`${API_BASE}${api.auth.login.path}`, {
        method: api.auth.login.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new ApiError(error.message || "Login failed", res.status);
      }

      return api.auth.login.responses[200].parse(await res.json());
    },

    onSuccess: async (data) => {

      // ✅ Store JWT token and role in sessionStorage for tab isolation
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("role", data.user.role);
      sessionStorage.setItem("loginTime", Date.now().toString());
      const userAny = data.user as Record<string, any>;
      sessionStorage.setItem("userId", userAny._id || String(data.user.id) || "");

      // ✅ Store user immediately in cache
      queryClient.setQueryData([api.auth.me.path], data.user);

      // ✅ CRITICAL FIX: clear stale unauthenticated cache
      queryClient.clear();

      // ✅ Restore authenticated user
      queryClient.setQueryData([api.auth.me.path], data.user);

      // ✅ Force all protected queries to refetch with new token
      await queryClient.invalidateQueries();

      await queryClient.refetchQueries();

      toast.success("Welcome back! Login successful.");

      // ✅ Redirect to dashboard
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1200);
    },

    onError: (error: Error, variables: LoginData) => {

      toast.dismiss();

      if (error instanceof ApiError) {
        if (error.status === 404) {
          toast.error("No account found with this email. Please sign up first.");
        } else if (error.status === 401) {
          toast.error("Incorrect password. Please try again.");
        } else if (error.status === 400) {
          toast.error("Please enter email and password.");
        } else if (error.status === 403) {
          toast.error(error.message || "Please verify your email before login.");
        } else if (error.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error("Login failed. Please try again.");
        }
      } else {
        toast.error("Login failed. Please try again.");
      }
    },
  });
}

function useRegisterMutation() {

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({

    mutationFn: async (data: RegisterData) => {

      const res = await fetch(`${API_BASE}${api.auth.register.path}`, {
        method: api.auth.register.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new ApiError(error.message || "Registration failed", res.status);
      }

      return api.auth.register.responses[201].parse(await res.json());
    },

    onSuccess: () => {

      toast.success("Account created successfully. Please login.");

      setTimeout(() => {
        setLocation("/login");
      }, 1500);
    },

    onError: (error: Error, variables: RegisterData) => {

      toast.dismiss();

      if (error instanceof ApiError) {
        if (error.status === 409) {
          toast.error(`Account already exists with email: ${variables.email}`);
        } else if (error.status === 400) {
          toast.error("Please fill all required signup fields.");
        } else if (error.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(error.message || "Signup failed. Try again.");
        }
      } else {
        toast.error("Signup failed. Try again.");
      }
    },
  });
}

function useLogoutMutation() {

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({

    mutationFn: async () => {

      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
        });
      } catch {
        // ignore if endpoint doesn't exist
      }
    },

    onSuccess: () => {

      // ✅ Clear all session data for tab isolation
      sessionStorage.clear();

      // ✅ Clear ALL cached queries completely
      queryClient.clear();

      toast.success("Logged out. See you next time!");


      // ✅ Redirect clean state
      setTimeout(() => setLocation("/login"), 500);
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {

  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({

    queryKey: [api.auth.me.path],

    queryFn: async () => {

      const token = sessionStorage.getItem("token");

      if (!token) {
        return null;
      }

      const res = await fetch(`${API_BASE}${api.auth.me.path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        sessionStorage.clear();
        toast.error("Session expired! Please login again.");
        window.location.href = "/login";
        return null;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }

      return api.auth.me.responses[200].parse(await res.json());
    },

    retry: false,
  });

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const registerMutation = useRegisterMutation();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {

  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}