import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { registerSchema } from "@shared/routes";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, Link } from "wouter";
import { Loader2, UserPlus, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { API_BASE } from "@/lib/api";

export default function Register() {
  const { registerMutation, user } = useAuth();
  const [, setLocation] = useLocation();
  const [role, setRole] = useState("student");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showFacultySecret, setShowFacultySecret] = useState(false);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "student",
      facultySecret: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    // For student registration, handle OTP flow — redirect to /verify-email
    if (data.role !== "faculty") {
      setSubmitting(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const errorData = await res.json();
          const err: any = new Error(errorData.message || "Registration failed");
          err.status = res.status;
          throw err;
        }
        const result = await res.json();
        if (result.requiresVerification) {
          toast.success("Verification code sent! Check your email.");
          setLocation(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }

        setLocation(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } catch (error: any) {
        toast.dismiss();

        if (error.status === 409) {
          toast.error(`Account already exists with email: ${data.email}`);
        } else {
          toast.error(error.message || "Signup failed. Try again.");
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      // Faculty registration uses existing mutation (no OTP)
      registerMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-xl border border-primary/25 dark:border-primary/40 shadow-primary/10 rounded-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Create an account</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-11 pr-10" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setRole(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {role === "faculty" && (
                <FormField
                  control={form.control}
                  name="facultySecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faculty Secret Code</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showFacultySecret ? "text" : "password"}
                            placeholder="Enter faculty secret code"
                            {...field}
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFacultySecret(!showFacultySecret)}
                            aria-label={showFacultySecret ? "Hide faculty secret" : "Show faculty secret"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showFacultySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                disabled={registerMutation.isPending || submitting}
              >
                {(registerMutation.isPending || submitting) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : role === "student" ? (
                  <ArrowRight className="mr-2 h-4 w-4" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {role === "student" ? "Continue" : "Register"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
