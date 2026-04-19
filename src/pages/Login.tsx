import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { requestEmailOtpApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, loginWithEmailOtp } = useAuth();
  const nav = useNavigate();
  const { role } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [signupOtpCooldown, setSignupOtpCooldown] = useState(0);

  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [resetOtpRequested, setResetOtpRequested] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetOtpCooldown, setResetOtpCooldown] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSignupOtpCooldown((prev) => (prev > 0 ? prev - 1 : prev));
      setResetOtpCooldown((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (role) return <Navigate to={role === "admin" ? "/admin" : role === "transport" ? "/transport" : "/catalog"} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      const r = await login(email, password);
      toast.success(r === "admin" ? "Welcome back, Admin" : "Welcome to SilkRoute");
      nav(r === "admin" ? "/admin" : r === "transport" ? "/transport" : "/catalog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    }
  };

  const requestOtp = async () => {
    if (!signupEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!signupPassword.trim()) {
      toast.error("Please create a password");
      return;
    }
    if (signupPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsOtpLoading(true);
    try {
      const result = await requestEmailOtpApi(signupEmail.trim().toLowerCase());
      setOtpRequested(true);
      setSignupOtpCooldown(30);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!signupEmail.trim() || !otpCode.trim()) {
      toast.error("Please enter email and OTP code");
      return;
    }

    setIsOtpLoading(true);
    try {
      const r = await loginWithEmailOtp(
        signupEmail.trim().toLowerCase(),
        otpCode.trim(),
        signupPassword,
        signupName.trim() || undefined,
      );
      toast.success("Account verified successfully");
      nav(r === "admin" ? "/admin" : r === "transport" ? "/transport" : "/catalog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const requestResetOtp = async () => {
    if (!resetEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!resetPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }
    if (resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsResetLoading(true);
    try {
      const result = await requestEmailOtpApi(resetEmail.trim().toLowerCase());
      setResetOtpRequested(true);
      setResetOtpCooldown(30);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsResetLoading(false);
    }
  };

  const verifyResetOtp = async () => {
    if (!resetEmail.trim() || !resetOtpCode.trim()) {
      toast.error("Please enter email and OTP code");
      return;
    }

    setIsResetLoading(true);
    try {
      await loginWithEmailOtp(
        resetEmail.trim().toLowerCase(),
        resetOtpCode.trim(),
        resetPassword,
      );
      toast.success("Password reset successful. Please sign in with your new password.");
      setEmail(resetEmail.trim().toLowerCase());
      setPassword("");
      setMode("signin");
      setResetOtpRequested(false);
      setResetOtpCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed");
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">SilkRoute</div>
            <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">Heritage Sarees</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="font-display text-5xl font-semibold leading-[1.1] text-balance">
            Six yards of <em className="not-italic text-accent">heritage</em>, woven for the modern world.
          </h1>
          <p className="text-lg opacity-85 leading-relaxed">
            B2C boutique pricing. B2B bulk intelligence. One catalog of authentic Indian craftsmanship.
          </p>
          <div className="flex gap-8 pt-4 text-sm">
            <div><div className="font-display text-2xl font-semibold">12k+</div><div className="opacity-75">Active buyers</div></div>
            <div><div className="font-display text-2xl font-semibold">28</div><div className="opacity-75">Indian states</div></div>
            <div><div className="font-display text-2xl font-semibold">450+</div><div className="opacity-75">Master weavers</div></div>
          </div>
        </div>

        <div className="relative text-xs opacity-70">© 2025 SilkRoute Pvt. Ltd. · Crafted in India</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-hero">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold">SilkRoute</span>
          </div>

          {mode === "signin" ? (
            <>
              <h2 className="font-display text-3xl font-semibold mb-2">Sign in</h2>
              <p className="text-muted-foreground mb-8">Sign in with your email and password.</p>

              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                </div>

                <Button type="submit" className="w-full h-11 gradient-hero hover:opacity-95 text-primary-foreground shadow-elegant">
                  Sign in <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">or</span></div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("signup")}
                >
                  Sign up as buyer
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("reset")}
                >
                  Forgot password?
                </Button>
              </form>
            </>
          ) : mode === "signup" ? (
            <>
              <h2 className="font-display text-3xl font-semibold mb-2">Create your account</h2>
              <p className="text-muted-foreground mb-8">Sign up using your email with one-time verification code.</p>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full name (optional)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Create password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="h-11"
                  />
                </div>

                {otpRequested && (
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Verification code</Label>
                    <Input
                      id="otp-code"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="h-11"
                      maxLength={6}
                    />
                  </div>
                )}

                {!otpRequested ? (
                  <Button type="button" className="w-full h-11 gradient-hero hover:opacity-95 text-primary-foreground shadow-elegant" onClick={requestOtp} disabled={isOtpLoading}>
                    {isOtpLoading ? "Sending code..." : "Send verification code"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button type="button" className="w-full h-11 gradient-hero hover:opacity-95 text-primary-foreground shadow-elegant" onClick={verifyOtp} disabled={isOtpLoading}>
                      {isOtpLoading ? "Verifying..." : "Verify and continue"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={requestOtp}
                      disabled={isOtpLoading || signupOtpCooldown > 0}
                    >
                      {signupOtpCooldown > 0 ? `Resend code in ${signupOtpCooldown}s` : "Resend verification code"}
                    </Button>
                  </div>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider">or</span></div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </Button>
              </div>

              <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
                ℹ️ We verify your email with OTP to reduce fake users and keep your account secure.
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl font-semibold mb-2">Reset password</h2>
              <p className="text-muted-foreground mb-8">Verify your email with OTP and set a new password.</p>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="h-11"
                  />
                </div>

                {resetOtpRequested && (
                  <div className="space-y-2">
                    <Label htmlFor="reset-otp-code">Verification code</Label>
                    <Input
                      id="reset-otp-code"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={resetOtpCode}
                      onChange={(e) => setResetOtpCode(e.target.value)}
                      className="h-11"
                      maxLength={6}
                    />
                  </div>
                )}

                {!resetOtpRequested ? (
                  <Button type="button" className="w-full h-11 gradient-hero hover:opacity-95 text-primary-foreground shadow-elegant" onClick={requestResetOtp} disabled={isResetLoading}>
                    {isResetLoading ? "Sending code..." : "Send reset code"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button type="button" className="w-full h-11 gradient-hero hover:opacity-95 text-primary-foreground shadow-elegant" onClick={verifyResetOtp} disabled={isResetLoading}>
                      {isResetLoading ? "Verifying..." : "Verify and reset password"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={requestResetOtp}
                      disabled={isResetLoading || resetOtpCooldown > 0}
                    >
                      {resetOtpCooldown > 0 ? `Resend code in ${resetOtpCooldown}s` : "Resend reset code"}
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
