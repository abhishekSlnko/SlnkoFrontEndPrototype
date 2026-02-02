import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import Axios from "@/utils/Axios"
import { useNavigate } from "react-router-dom"; // Add this
// import React from "react"
// UI Components
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

// Zustand Store
import { useAuthStore } from "../../../store/useAuthStore"

export default function CreateAccount() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Zustand state and actions
  const { formData, updateField } = useAuthStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // We cast e.target.id to keyof AuthFormData to satisfy TypeScript
    updateField(e.target.id as any, e.target.value)
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Mapping fields to match your Backend (user.controller.js)
  const payload = {
    name: formData.name,
    email: formData.email,
    emp_id: formData.username, // UI 'username' -> Backend 'emp_id'
    password: formData.password,
    phone: formData.phone || "0000000000", 
    department: formData.state || "General", 
    role: "User", 
    location: formData.city || "", 
    about: "", 
    attachment_url: "" 
  };

  try {
    // Calling the specific route from your backend: /user-registratioN-IT
    const response = await Axios.post("/user-registratioN-IT", payload);
    
    if (response.status === 200) {
      alert("User registered successfully!");
      navigate("/login"); 
    }
  } catch (error: any) {
    console.error("Registration Error:", error);
    const errorMsg = error.response?.data?.msg || "Server error occurred";
    alert(errorMsg); // Using standard alert instead of toast
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#060b1a] to-black px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6 text-white">
          <span className="text-xl">⌘</span>
          <span className="text-lg font-semibold">ProTrac</span>
        </div>

        {/* Header */}
        <h2 className="text-xl font-semibold text-white">Create an account</h2>
        <p className="text-sm text-gray-400 mt-1">
          Enter your email and password to create an account.{" "}
          <span className="text-gray-300">
            Already have an account? <a href="#" className="text-blue-400 hover:underline">Sign In</a>
          </span>
        </p>

        {/* Error */}
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
          Invitation link is invalid or expired. <a href="#" className="underline">Go to sign in</a>
        </div>

        {/* Form */}
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>

          <Field id="name" label="Name">
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="eg: John Doe"
              className="text-white placeholder:text-gray-400"
            />
          </Field>

          <Field id="email" label="Email">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="text-white placeholder:text-gray-400"
            />
          </Field>

          <Field id="username" label="Username">
            <Input
              id="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="eg: john.doe"
              className="text-white placeholder:text-gray-400"
            />
          </Field>

          <Field id="dob" label="Date of Birth">
            <Input
              id="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              className="text-white [&::-webkit-calendar-picker-indicator]:invert"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="village" label="Village">
              <Input
                id="village"
                value={formData.village}
                onChange={handleChange}
                placeholder="Village"
                className="text-white placeholder:text-gray-400"
              />
            </Field>
            <Field id="city" label="City">
              <Input
                id="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                className="text-white placeholder:text-gray-400"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="state" label="State">
              <Select 
                value={formData.state} 
                onValueChange={(val) => updateField("state", val)}
              >
                <SelectTrigger className="text-white">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mh">Maharashtra</SelectItem>
                  <SelectItem value="dl">Delhi</SelectItem>
                  <SelectItem value="ka">Karnataka</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="country" label="Country">
              <Input
                value={formData.country}
                disabled
                className="text-white/70"
              />
            </Field>
          </div>

          <PasswordField
            id="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            show={showPassword}
            toggle={() => setShowPassword(!showPassword)}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            show={showConfirmPassword}
            toggle={() => setShowConfirmPassword(!showConfirmPassword)}
          />

          <Button
            type="submit"
            className="w-full mt-2 bg-blue-600/60 hover:bg-blue-600/80"
          >
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-xs text-center text-gray-400">
          By creating an account, you agree to our{" "}
          <a href="#" className="underline">Terms of Service</a> and{" "}
          <a href="#" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}

/* ------------------ Helpers ------------------ */

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-gray-300">{label}</Label>
      {children}
    </div>
  )
}

function PasswordField({
  id,
  label,
  show,
  toggle,
  value,
  onChange,
}: {
  id: string
  label: string
  show: boolean
  toggle: () => void
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-gray-300">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={onChange}
          type={show ? "text" : "password"}
          className="pr-10 text-white placeholder:text-gray-400"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
      </div>
    </div>
  )
}