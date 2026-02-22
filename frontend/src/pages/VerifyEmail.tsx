import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";

export default function VerifyEmail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const emailFromUrl = params.get("email") || "";

  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  useEffect(() => {
    if (!emailFromUrl) {
      toast.error("Email required — please start registration again");
      setLocation("/register");
    }
  }, [emailFromUrl, setLocation]);

  const handleVerifyOtp = async () => {
    if (!emailFromUrl) {
      toast.error("Email required — please register again");
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromUrl, code: otpCode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Verification failed");
      }
      toast.success("Account created successfully!");
      setTimeout(() => {
        setLocation("/login");
      }, 4000);
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!emailFromUrl) {
      toast.error("Email required — please register again");
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromUrl }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Resend failed");
      }
      toast.success("Code resent! Check your email.");
    } catch (error: any) {
      toast.error(error.message || "Resend failed");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-xl border border-primary/25 dark:border-primary/40 shadow-primary/10 rounded-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            We sent a 6-digit code to <strong>{emailFromUrl}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Verification Code</label>
            <Input
              placeholder="Enter 6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-11 text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>
          <Button
            onClick={handleVerifyOtp}
            className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            disabled={verifying}
          >
            {verifying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Verify & Complete Registration
          </Button>
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={resending}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {resending ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              Resend Code
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
