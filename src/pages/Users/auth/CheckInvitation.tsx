import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Axios from "@/utils/Axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

type Status = "loading" | "error" | "success";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function CheckInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState<any>(null);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    village: "",
    city: "",
    state: "",
    country: "India",
    about: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Invitation link is invalid.");
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await Axios.post("/auth/verify-token", { token });
      if (res.data.valid) {
        setUser(res.data.user);
        setStatus("success");
        if (res.data.user.username) {
          setFormData(prev => ({ ...prev, username: res.data.user.username }));
        }
      } else {
        setStatus("error");
        setErrorMsg("Invitation link expired or invalid.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.response?.data?.msg || "Verification failed.");
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }

    try {
      // We combine the address fields for the backend if your backend still expects 'location'
      // Or send them individually if you updated the backend schema
      const payload = {
        ...formData,
        token,
        location: `${formData.village}, ${formData.city}, ${formData.state}, ${formData.country}`
      };

      await Axios.post("/auth/complete-profile", payload);
      toast.success("Account activated successfully!");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.msg || "Profile update failed");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Verifying...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-[#0f172a]/40 border border-red-500/30 p-8 rounded-xl text-center">
          <p className="text-red-400">{errorMsg}</p>
          <Button onClick={() => navigate("/login")} className="mt-6 bg-blue-500 hover:bg-blue-600 text-white">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#020617] flex flex-col md:flex-row text-white overflow-hidden">
      
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 py-6 overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-[420px] mx-auto">
          <div className="flex justify-center mb-12">
            <img
              src="/logo.png"
              alt="ProTrac Logo"
              className="h-20 w-auto object-contain"
            />
          </div>
          <div className="mb-4 text-center md:text-left">
            <h2 className="text-xl font-bold tracking-tight">Complete Profile</h2>
            <p className="text-gray-400 text-xs mt-0.5">Finalize details to access your dashboard</p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-y-3 gap-x-6 py-3 border-y border-white/5">
            <div>
              <p className="text-[9px] uppercase text-gray-500 font-bold mb-0.5">Name</p>
              <p className="text-xs text-gray-200">{user?.name}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-gray-500 font-bold mb-0.5">Employee ID</p>
              <p className="text-xs text-gray-200">{user?.emp_id}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[9px] uppercase text-gray-500 font-bold mb-0.5">Role & Department</p>
              <p className="text-xs text-gray-200">{user?.role.toUpperCase()} • {user?.department}</p>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleProfileSubmit}>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">Username</Label>
                <Input
                  required
                  placeholder="j_doe"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="h-8 bg-[#0f172a]/40 border-white/10 text-xs focus-visible:ring-blue-500/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">Phone</Label>
                <Input
                  placeholder="+91..."
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="h-8 bg-[#0f172a]/40 border-white/10 text-xs focus-visible:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Address Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">Village</Label>
                <Input
                  placeholder="Village name"
                  value={formData.village}
                  onChange={(e) => setFormData({...formData, village: e.target.value})}
                  className="h-8 bg-[#0f172a]/40 border-white/10 text-xs focus-visible:ring-blue-500/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">City</Label>
                <Input
                  placeholder="City name"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="h-8 bg-[#0f172a]/40 border-white/10 text-xs focus-visible:ring-blue-500/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">State</Label>
                <select
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="flex h-8 w-full rounded-md border border-white/10 bg-[#0f172a]/40 px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 text-white"
                >
                  <option value="" disabled className="bg-[#0f172a]">Select State</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state} className="bg-[#0f172a]">{state}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">Country</Label>
                <Input
                  value="India"
                  readOnly
                  disabled
                  className="h-8 bg-[#0f172a]/20 border-white/5 text-gray-500 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                    className="h-8 pr-8 bg-[#0f172a]/40 border-white/10 text-xs focus-visible:ring-blue-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300 text-[11px]">Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="h-8 pr-8 bg-[#0f172a]/40 border-white/10 text-xs focus-visible:ring-blue-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white h-9 mt-1 text-xs font-medium shadow-lg shadow-blue-500/10"
            >
              Activate Account
            </Button>
          </form>
        </div>
      </div>

      <div className="hidden md:flex w-1/2 bg-[#0b0f1a] relative items-center justify-start border-l border-white/5">
        <div className="w-full h-[80%] pl-12">
          <div className="w-full h-full rounded-tl-xl border-t border-l border-white/10 overflow-hidden shadow-[20px_0_60px_rgba(0,0,0,0.8)]">
            <img
              src="/dashboard-preview.png"
              alt="Dashboard Preview"
              className="w-full h-full object-cover object-left-top opacity-80"
            />
          </div>
        </div>
      </div>
    </div>
  );
}