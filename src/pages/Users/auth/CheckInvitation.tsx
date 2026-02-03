import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Axios from "@/utils/Axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "loading" | "error" | "success";

export default function CheckInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState<any>(null);

  // Profile and Security fields
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    location: "",
    about: "",
    currentPassword: "", 
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
        // Pre-fill username if the HR provided it, otherwise keep it empty for user input
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
      alert("New passwords do not match!");
      return;
    }

    try {
      await Axios.post("/auth/complete-profile", {
        token,
        ...formData,
      });

      alert("Account activated successfully!");
      navigate("/login");
    } catch (err: any) {
      alert(err.response?.data?.msg || "Profile update failed");
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-white">Verifying invitation...</div>;
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl text-center text-red-400">
          {errorMsg}
          <div className="mt-4">
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#060b1a] to-black px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-8 text-white">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Complete your profile</h2>
          <p className="text-sm text-gray-400 mt-1">Please review your information and set your password.</p>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          
          {/* Section 1: Read-Only Info (from HR/Database) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg border border-white/5">
            <div className="space-y-1">
              <Label className="text-gray-400">Full Name</Label>
              <Input value={user?.name || ""} disabled className="bg-transparent border-white/10 text-gray-300" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400">Email Address</Label>
              <Input value={user?.email || ""} disabled className="bg-transparent border-white/10 text-gray-300" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400">Employee ID</Label>
              <Input value={user?.emp_id || ""} disabled className="bg-transparent border-white/10 text-gray-300" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400">Department</Label>
              <Input value={user?.department || "N/A"} disabled className="bg-transparent border-white/10 text-gray-300" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-gray-400">Designated Role</Label>
              <Input value={user?.role || ""} disabled className="bg-transparent border-white/10 text-gray-300" />
            </div>
          </div>

          {/* Section 2: Editable Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input 
                required
                placeholder="Choose a unique username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <Label>Phone Number</Label>
              <Input 
                placeholder="Mobile number"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Work Location</Label>
              <Input 
                placeholder="Current City/Office"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})} 
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>About Me</Label>
              <Input
                placeholder="Tell us about your expertise"
                value={formData.about}
                onChange={(e) => setFormData({...formData, about: e.target.value})}
              />
            </div>
          </div>

          {/* Section 3: Security */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-md font-semibold text-yellow-500 mb-4">Security Verification</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Temporary Password</Label>
                <p className="text-[11px] text-gray-500 mb-2">Enter the system-generated password sent to your email.</p>
                <Input
                  type="password"
                  required
                  placeholder="Paste temporary password here"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    required
                    placeholder="Create new password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-lg font-medium">
            Activate Account & Finalize Profile
          </Button>
        </form>
      </div>
    </div>
  );
}