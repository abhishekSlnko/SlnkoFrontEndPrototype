import { Eye, EyeOff, LogIn } from "lucide-react"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false)

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
            <h2 className="text-xl font-bold tracking-tight">
              Sign in
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Enter your email and password below to log into your account
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="bg-[#0f172a]/40 border-white/10 focus-visible:ring-blue-500/50"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-200">
                  Password
                </Label>
                <a
                  href="#"
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-10 bg-[#0f172a]/40 border-white/10 focus-visible:ring-blue-500/50"
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
              className="w-full flex items-center gap-2 bg-blue-500 hover:bg-blue-600 mt-2"
            >
              <LogIn size={16} />
              Sign in
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-[11px] text-gray-500 text-center leading-relaxed">
            By clicking sign in, you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-gray-300">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-2 hover:text-gray-300">
              Privacy Policy
            </a>.
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
