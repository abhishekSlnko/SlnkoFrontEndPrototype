import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

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
        <h2 className="text-xl font-semibold text-white">Create an account</h2>
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
          <Input label="Name" placeholder="eg: John Doe" />
          <Input label="Email" placeholder="name@example.com" type="email" />
          <Input label="Username" placeholder="eg: john.doe" />

          <Input label="Date of Birth" type="date" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Village" placeholder="Village" />
            <Input label="City" placeholder="City" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="State" />
            <Input label="Country" value="India" disabled />
          </div>

          {/* Password */}
          <PasswordInput
            label="Password"
            show={showPassword}
            toggle={() => setShowPassword(!showPassword)}
          />

          <PasswordInput
            label="Confirm Password"
            show={showConfirmPassword}
            toggle={() => setShowConfirmPassword(!showConfirmPassword)}
          />

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-blue-600/50 hover:bg-blue-600/70 transition text-white py-2.5 font-medium disabled:opacity-50"
          >
            Create Account
          </button>
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

/* ------------------ Reusable Components ------------------ */

function Input({
  label,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <input
        type={type}
        className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
        {...props}
      />
    </div>
  )
}

function Select({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <select className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600/40">
        <option>Select state</option>
        <option>Maharashtra</option>
        <option>Delhi</option>
        <option>Karnataka</option>
      </select>
    </div>
  )
}

function PasswordInput({
  label,
  show,
  toggle,
}: {
  label: string
  show: boolean
  toggle: () => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
