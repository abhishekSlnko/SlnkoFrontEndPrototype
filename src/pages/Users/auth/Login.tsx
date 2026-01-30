import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

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

export default function CreateAccount() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#060b1a] to-black px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6 text-white">
          <span className="text-xl">⌘</span>
          <span className="text-lg font-semibold">ProTrac</span>
        </div>

        {/* Header */}
        <h2 className="text-xl font-semibold text-white">
          Create an account
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Enter your email and password to create an account.{" "}
          <span className="text-gray-300">
            Already have an account?{" "}
            <a href="#" className="text-blue-400 hover:underline">
              Sign In
            </a>
          </span>
        </p>

        {/* Error */}
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
          Invitation link is invalid or expired.{" "}
          <a href="#" className="underline">
            Go to sign in
          </a>
        </div>

        {/* Form */}
        <form className="mt-5 space-y-4">

          <Field id="name" label="Name">
            <Input placeholder="eg: John Doe" />
          </Field>

          <Field id="email" label="Email">
            <Input type="email" placeholder="name@example.com" />
          </Field>

          <Field id="username" label="Username">
            <Input placeholder="eg: john.doe" />
          </Field>

          <Field id="dob" label="Date of Birth">
            <Input type="date" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="village" label="Village">
              <Input placeholder="Village" />
            </Field>
            <Field id="city" label="City">
              <Input placeholder="City" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="state" label="State">
              <Select>
                <SelectTrigger>
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
              <Input value="India" disabled />
            </Field>
          </div>

          <PasswordField
            id="password"
            label="Password"
            show={showPassword}
            toggle={() => setShowPassword(!showPassword)}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm Password"
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
          <a href="#" className="underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}

/* ------------------ Helpers (shadcn style) ------------------ */

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-gray-300">
        {label}
      </Label>
      {children}
    </div>
  )
}

function PasswordField({
  id,
  label,
  show,
  toggle,
}: {
  id: string
  label: string
  show: boolean
  toggle: () => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-gray-300">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          className="pr-10"
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
