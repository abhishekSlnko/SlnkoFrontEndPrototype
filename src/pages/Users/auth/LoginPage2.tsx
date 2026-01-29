import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#060b1a] to-black px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-6">

        {/* Logo */} 
        {/* Logo */}
        <div className="flex justify-center mb-8">
        <img
            src="/logo.png"
            alt="ProTrac Logo"
            className="h-14 object-contain"
        />
        </div>


        {/* Header */}
        <h2 className="text-xl font-semibold text-white">Sign in</h2>
        <p className="text-sm text-gray-400 mt-1">
          Enter your email and password below
          <br />
          to log into your account
        </p>

        {/* Form */}
        <form className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="name@example.com"
          />

          <PasswordInput
            label="Password"
            show={showPassword}
            toggle={() => setShowPassword(!showPassword)}
          />

          <div className="flex justify-end">
            <a
              href="#"
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white py-2.5 font-medium"
          >
            → Sign in
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-gray-400">
          By clicking sign in, you agree to our{" "}
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

/* ------------------ Reused Components ------------------ */

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
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-300">{label}</label>
      </div>

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
