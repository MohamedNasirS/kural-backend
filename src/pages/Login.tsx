import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import KuralFullLogo from "@/assets/images/Kural_full.png";

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        toast.error(result.message ?? 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col">
        <div className="mb-12">
          <img src={KuralFullLogo} alt="KuralApp" className="h-12 w-auto" />
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Campaign Intelligence
            <br />
            Platform
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Manage voters, coordinate field teams, and make data-driven decisions for your constituency.
          </p>
        </div>

        <p className="text-white/60 text-sm mt-auto">
          © {new Date().getFullYear()} KuralApp. All rights reserved.
        </p>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-end p-6">
          <ThemeToggle />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-4">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 block mx-auto"
              >
                ← Back to home
              </button>
              <img src={KuralFullLogo} alt="KuralApp" className="mx-auto h-10 w-auto" />
            </div>

            {/* Welcome Text */}
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Sign in to your account
              </p>
            </div>

            {/* Login Form */}
            <Card className="p-6 shadow-lg">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email or Mobile Number
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your email or phone"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              {/* Help Text */}
              <p className="text-center text-sm text-muted-foreground mt-4">
                Need help? Contact your administrator
              </p>
            </Card>

            {/* Back to home - Desktop */}
            <button
              onClick={() => navigate("/")}
              className="hidden lg:block text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              ← Back to home
            </button>

            {/* Mobile Footer */}
            <div className="lg:hidden text-center pt-8 border-t">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} KuralApp. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
