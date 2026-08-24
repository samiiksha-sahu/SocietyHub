import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Mail, Lock, User, Eye, EyeOff, MapPin, Layers, Hash } from "lucide-react";
import axios from "axios";
import { COOKIE_NAME } from "@/const";
import { trpc } from "@/lib/trpc";

export default function Register() {
  const [role, setRole] = useState<"resident" | "admin">("resident");
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Admin-only fields
  const [societyName, setSocietyName] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [totalWings, setTotalWings] = useState("");
  const [totalUnits, setTotalUnits] = useState("");

  // Resident-only fields
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [wing, setWing] = useState("");
  const [flatNumber, setFlatNumber] = useState("");

  const [loading, setLoading] = useState(false);

  // Fetch societies list via REST API
  const [societies, setSocieties] = useState<any[]>([]);
  useEffect(() => {
    axios.get("/api/societies")
      .then(res => {
        if (Array.isArray(res.data)) {
          setSocieties(res.data);
        }
      })
      .catch(err => {
        console.error("Failed to load societies", err);
      });
  }, []);

  // Redirect if already logged in
  if (user) {
    if (user.role === "admin") {
      setLocation("/dashboard/admin");
    } else {
      setLocation("/dashboard/resident");
    }
    return null;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        role,
        name,
        email,
        password,
      };

      if (role === "admin") {
        if (!societyName || !area || !city || !totalWings || !totalUnits) {
          toast.error("Please fill in all society fields");
          setLoading(false);
          return;
        }
        payload.societyName = societyName;
        payload.area = area;
        payload.city = city;
        payload.totalWings = Number(totalWings);
        payload.totalUnits = Number(totalUnits);
      } else {
        if (!selectedSocietyId || !wing || !flatNumber) {
          toast.error("Please select a society and fill in unit details");
          setLoading(false);
          return;
        }
        payload.societyId = Number(selectedSocietyId);
        payload.wing = wing;
        payload.flatNumber = flatNumber;
      }

      const response = await axios.post("/api/auth/register", payload);

      if (response.data?.success) {
        if (response.data.token) {
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${response.data.token}`);
        }
        toast.success("Account created successfully!");
        window.location.href = response.data.redirect || "/";
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F8FAFC] p-4 text-[#334155] py-12">
      <div className="w-full max-w-[460px]">
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
            <CardTitle className="text-xl font-extrabold text-[#0F172A]">Create Account</CardTitle>
            <CardDescription className="text-xs text-[#64748B] mt-1">
              Join your society management portal
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Select Tabs */}
              <Tabs
                value={role}
                onValueChange={(val) => setRole(val as "resident" | "admin")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger
                    value="resident"
                    className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#E53935] data-[state=active]:shadow-sm py-2"
                  >
                    Register as Resident
                  </TabsTrigger>
                  <TabsTrigger
                    value="admin"
                    className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#E53935] data-[state=active]:shadow-sm py-2"
                  >
                    Register as Admin
                  </TabsTrigger>
                </TabsList>

                {/* Common credentials */}
                <div className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#334155]">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-10 rounded-xl border-slate-200 text-sm focus-visible:ring-[#E53935] py-5"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#334155]">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
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
                        placeholder="••••••••"
                        className="pl-10 pr-10 rounded-xl border-slate-200 text-sm focus-visible:ring-[#E53935] py-5"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <TabsContent value="admin" className="space-y-4 pt-2 mt-0">
                  <div className="border-t border-slate-100 my-4 pt-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Society Details</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#334155]">Society Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        required={role === "admin"}
                        value={societyName}
                        onChange={(e) => setSocietyName(e.target.value)}
                        placeholder="e.g. Green Valley Heights"
                        className="pl-10 rounded-xl border-slate-200 text-sm focus-visible:ring-[#E53935] py-5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#334155]">Area / Locality</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          required={role === "admin"}
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          placeholder="e.g. Whitefield"
                          className="pl-9 rounded-xl border-slate-200 text-xs focus-visible:ring-[#E53935] py-5"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#334155]">City</label>
                      <Input
                        type="text"
                        required={role === "admin"}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="rounded-xl border-slate-200 text-xs focus-visible:ring-[#E53935] py-5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#334155]">Total Wings</label>
                      <div className="relative">
                        <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="number"
                          required={role === "admin"}
                          value={totalWings}
                          onChange={(e) => setTotalWings(e.target.value)}
                          placeholder="e.g. 3"
                          className="pl-9 rounded-xl border-slate-200 text-xs focus-visible:ring-[#E53935] py-5"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#334155]">Total Units</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="number"
                          required={role === "admin"}
                          value={totalUnits}
                          onChange={(e) => setTotalUnits(e.target.value)}
                          placeholder="e.g. 150"
                          className="pl-9 rounded-xl border-slate-200 text-xs focus-visible:ring-[#E53935] py-5"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="resident" className="space-y-4 pt-2 mt-0">
                  <div className="border-t border-slate-100 my-4 pt-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Unit Details</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#334155]">Select Society</label>
                    <select
                      required={role === "resident"}
                      value={selectedSocietyId}
                      onChange={(e) => setSelectedSocietyId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 text-sm focus:border-[#E53935] focus:outline-none p-3 bg-white"
                    >
                      <option value="">-- Choose Society --</option>
                      {societies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.area}, {s.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#334155]">Wing / Block</label>
                      <Input
                        type="text"
                        required={role === "resident"}
                        value={wing}
                        onChange={(e) => setWing(e.target.value)}
                        placeholder="e.g. B"
                        className="rounded-xl border-slate-200 text-sm focus-visible:ring-[#E53935] py-5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#334155]">Flat Number</label>
                      <Input
                        type="text"
                        required={role === "resident"}
                        value={flatNumber}
                        onChange={(e) => setFlatNumber(e.target.value)}
                        placeholder="e.g. 402"
                        className="rounded-xl border-slate-200 text-sm focus-visible:ring-[#E53935] py-5"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#E53935] hover:bg-[#C62828] text-white py-5 text-sm font-semibold shadow-md shadow-red-100 hover:shadow-lg transition-all duration-200 mt-4"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            {/* Toggle link */}
            <div className="mt-6 text-center text-xs">
              <span className="text-slate-400">Already have an account? </span>
              <button
                onClick={() => setLocation("/login")}
                className="font-extrabold text-[#E53935] hover:underline"
              >
                Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
