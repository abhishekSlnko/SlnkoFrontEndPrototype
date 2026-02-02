import { Eye, EyeOff, LogIn } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

// 1. Import your Zustand store
import { useAuthStore } from "../../../store/useAuthStore" 

export default function SignIn() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 2. Local state for form inputs
  const [email, setEmail] = useState("") // This will be sent as 'identity'
  const [password, setPassword] = useState("")

  // 3. Get the login action from Zustand
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 4. Call the Zustand login action
      // We map our 'email' state to 'identity' because your backend needs it
      await login({ identity: email, password })
      
      toast.success("Welcome back!")
      navigate("/dashboard-projects")
    } catch (err: any) {
      // Display the error message returned from your backend
      toast.error(err.toString() || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col md:flex-row text-white overflow-hidden">
      
      {/* ================= LEFT SECTION ================= */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 py-12">
        <div className="w-full max-w-[350px]">

          {/* Logo */}
          <div className="flex justify-center mb-12">
            <img
              src="/logo.png"
              alt="ProTrac Logo"
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight">Sign in</h2>
            <p className="text-gray-400 text-sm mt-1">
              Enter your email and password below to log into your account
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Email / Identity */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-200">
                Email or Employee ID
              </Label>
              <Input
                id="email"
                type="text" // Changed to text to support Emp ID/Name as well
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#0f172a]/40 border-white/10 focus-visible:ring-blue-500/50 text-white"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-200">
                  Password
                </Label>
                <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">
                  Forgot password?
                </a>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 bg-[#0f172a]/40 border-white/10 focus-visible:ring-blue-500/50 text-white"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center gap-2 bg-blue-500 hover:bg-blue-600 mt-2 text-white"
            >
              {isLoading ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign in
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-[11px] text-gray-500 text-center leading-relaxed">
            By clicking sign in, you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-gray-300">Terms of Service</a> and{" "}
            <a href="#" className="underline underline-offset-2 hover:text-gray-300">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* ================= RIGHT SECTION ================= */}
      <div className="hidden md:flex w-1/2 bg-[#0b0f1a] relative items-center justify-start border-l border-white/5">
        <div className="w-full h-[80%] pl-12">
          <div className="w-full h-full rounded-tl-xl border-t border-l border-white/10 shadow-[20px_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
            <img
              src="/dashboard-preview.png"
              alt="Dashboard Preview"
              className="w-full h-full object-cover object-left-top opacity-90"
            />
          </div>
        </div>
      </div>
    </div>
  )
}