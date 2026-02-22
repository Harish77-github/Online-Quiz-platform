import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";

export default function ForgotPassword() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const handleSendResetCode = async () => {
    if (!email) {
      toast.error("Enter your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send code");
      }
      toast.success("Reset code sent! Check your email.");
      setLocation(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-xl border border-primary/25 dark:border-primary/40 shadow-primary/10 rounded-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a reset code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email Address</label>
            <Input
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              type="email"
            />
          </div>
          <Button
            onClick={handleSendResetCode}
            className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send Reset Code
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
