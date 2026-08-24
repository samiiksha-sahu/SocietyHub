import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { COOKIE_NAME } from "@/const";

export default function Login() {
  const [role, setRole] = useState<"resident" | "admin">("resident");
  const [email, setEmail] = useState("resident@society.com");
  const [password, setPassword] = useState("resident123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // If already logged in, redirect straight to their dashboard
  if (user) {
    if (user.role === "admin") {
      setLocation("/dashboard/admin");
    } else {
      setLocation("/dashboard/resident");
    }
    return null;
  }

  const handleRoleChange = (newRole: "resident" | "admin") => {
    setRole(newRole);
    setEmail(newRole === "admin" ? "admin@society.com" : "resident@society.com");
    setPassword(newRole === "admin" ? "admin123" : "resident123");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      if (response.data?.success) {
        if (response.data.token) {
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${response.data.token}`);
        }
        toast.success("Successfully logged in!");
        
        // Hard reload to apply cookie values cleanly
        window.location.href = role === "admin" ? "/dashboard/admin" : "/dashboard/resident";
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F8FAFC] p-4 text-[#334155]">
      <div className="w-full max-w-[420px]">
        {/* Logo Branding */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded bg-[#E53935] text-white shadow-md">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0F172A]">
            Society<span className="text-[#E53935]">Hub</span>
          </span>
        </div>

        <Card className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-100">
          <CardHeader className="pb-4 pt-6 text-center">
            <CardTitle className="text-xl font-extrabold text-[#0F172A]">Sign In</CardTitle>
            <CardDescription className="text-xs text-[#64748B] mt-1">
              Access your society management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {/* Role Select Tabs */}
            <Tabs value={role} onValueChange={(val) => handleRoleChange(val as "resident" | "admin")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="resident" 
                  className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#E53935] data-[state=active]:shadow-sm py-2"
                >
                  Resident Login
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#E53935] data-[state=active]:shadow-sm py-2"
                >
                  Admin / Committee
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#334155]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@society.com"
                    className="pl-10 rounded-xl border-slate-200 text-sm focus-visible:ring-[#E53935] py-5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#334155]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-10 pr-10 rounded-xl border-slate-200 text-sm focus-visible:ring-[#E53935] py-5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#E53935] hover:bg-[#C62828] text-white py-5 text-sm font-semibold shadow-md shadow-red-100 hover:shadow-lg transition-all duration-200 mt-2"
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* Toggle link */}
            <div className="mt-6 text-center text-xs">
              <span className="text-slate-400">Don't have an account? </span>
              <button
                onClick={() => setLocation("/register")}
                className="font-extrabold text-[#E53935] hover:underline"
              >
                Sign Up
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
