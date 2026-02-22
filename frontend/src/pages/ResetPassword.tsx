import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";

export default function ResetPassword() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const emailFromUrl = params.get("email") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Email required");
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error("Password too short — enter at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Reset failed");
      }
      toast.success("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        setLocation("/login");
      }, 4000);
    } catch (error: any) {
      toast.error(error.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-xl border border-primary/25 dark:border-primary/40 shadow-primary/10 rounded-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            {emailFromUrl
              ? <>Enter the code sent to <strong>{emailFromUrl}</strong> and your new password</>
              : "Enter your email, reset code, and new password"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              type="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">OTP Code</label>
            <Input
              placeholder="Enter 6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-11 text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">New Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Confirm Password</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            onClick={handleResetPassword}
            className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Reset Password
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
