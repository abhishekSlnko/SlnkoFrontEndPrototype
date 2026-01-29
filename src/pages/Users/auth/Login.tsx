// import { Eye, EyeOff } from "lucide-react"
// import { useState } from "react"

// export default function CreateAccount() {
//   const [showPassword, setShowPassword] = useState(false)
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false)

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#060b1a] to-black px-4">
//       <div className="w-full max-w-md rounded-2xl bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
        
//         {/* Logo */}
//         <div className="flex items-center justify-center gap-2 mb-6 text-white">
//           <span className="text-xl">⌘</span>
//           <span className="text-lg font-semibold">ProTrac</span>
//         </div>

//         {/* Header */}
//         <h2 className="text-xl font-semibold text-white">Create an account</h2>
//         <p className="text-sm text-gray-400 mt-1">
//           Enter your email and password to create an account.{" "}
//           <span className="text-gray-300">
//             Already have an account?{" "}
//             <a href="#" className="text-blue-400 hover:underline">
//               Sign In
//             </a>
//           </span>
//         </p>

//         {/* Error */}
//         <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
//           Invitation link is invalid or expired.{" "}
//           <a href="#" className="underline">
//             Go to sign in
//           </a>
//         </div>

//         {/* Form */}
//         <form className="mt-5 space-y-4">
//           <Input label="Name" placeholder="eg: John Doe" />
//           <Input label="Email" placeholder="name@example.com" type="email" />
//           <Input label="Username" placeholder="eg: john.doe" />

//           <Input label="Date of Birth" type="date" />

//           <div className="grid grid-cols-2 gap-3">
//             <Input label="Village" placeholder="Village" />
//             <Input label="City" placeholder="City" />
//           </div>

//           <div className="grid grid-cols-2 gap-3">
//             <Select label="State" />
//             <Input label="Country" value="India" disabled />
//           </div>

//           {/* Password */}
//           <PasswordInput
//             label="Password"
//             show={showPassword}
//             toggle={() => setShowPassword(!showPassword)}
//           />

//           <PasswordInput
//             label="Confirm Password"
//             show={showConfirmPassword}
//             toggle={() => setShowConfirmPassword(!showConfirmPassword)}
//           />

//           <button
//             type="submit"
//             className="mt-2 w-full rounded-lg bg-blue-600/50 hover:bg-blue-600/70 transition text-white py-2.5 font-medium disabled:opacity-50"
//           >
//             Create Account
//           </button>
//         </form>

//         <p className="mt-6 text-xs text-center text-gray-400">
//           By creating an account, you agree to our{" "}
//           <a href="#" className="underline">
//             Terms of Service
//           </a>{" "}
//           and{" "}
//           <a href="#" className="underline">
//             Privacy Policy
//           </a>
//           .
//         </p>
//       </div>
//     </div>
//   )
// }

// /* ------------------ Reusable Components ------------------ */

// function Input({
//   label,
//   type = "text",
//   ...props
// }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
//   return (
//     <div className="space-y-1">
//       <label className="text-sm text-gray-300">{label}</label>
//       <input
//         type={type}
//         className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
//         {...props}
//       />
//     </div>
//   )
// }

// function Select({ label }: { label: string }) {
//   return (
//     <div className="space-y-1">
//       <label className="text-sm text-gray-300">{label}</label>
//       <select className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600/40">
//         <option>Select state</option>
//         <option>Maharashtra</option>
//         <option>Delhi</option>
//         <option>Karnataka</option>
//       </select>
//     </div>
//   )
// }

// function PasswordInput({
//   label,
//   show,
//   toggle,
// }: {
//   label: string
//   show: boolean
//   toggle: () => void
// }) {
//   return (
//     <div className="space-y-1">
//       <label className="text-sm text-gray-300">{label}</label>
//       <div className="relative">
//         <input
//           type={show ? "text" : "password"}
//           className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
//         />
//         <button
//           type="button"
//           onClick={toggle}
//           className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
//         >
//           {show ? <EyeOff size={16} /> : <Eye size={16} />}
//         </button>
//       </div>
//     </div>
//   )
// }
import { Eye, EyeOff, LogIn } from "lucide-react"
import { useState } from "react"

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    // Main container: Deep dark background to match the screenshot
    <div className="min-h-screen bg-[#020617] flex flex-col md:flex-row text-white overflow-hidden font-sans">
      
      {/* ================= LEFT SECTION: SIGN IN ================= */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 py-12">
        
        <div className="w-full max-w-[350px]">
          
          {/* Logo - Perfectly centered above the form */}
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
          <form className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full rounded-md bg-[#0f172a]/40 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-200">Password</label>
                <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-md bg-[#0f172a]/40 border border-white/10 px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#3b82f6] hover:bg-[#2563eb] transition-all py-2 text-sm font-semibold mt-2"
            >
              <LogIn size={16} />
              Sign in
            </button>
          </form>

          {/* Footer Links */}
          <p className="mt-6 text-[11px] text-gray-500 text-center leading-relaxed">
            By clicking sign in, you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-gray-300">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-2 hover:text-gray-300">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* ================= RIGHT SECTION: DASHBOARD PREVIEW ================= */}
      <div className="hidden md:flex w-1/2 bg-[#0b0f1a] relative items-center justify-start border-l border-white/5">
        
        {/* Peephole effect for the dashboard */}
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
// import { Eye, EyeOff } from "lucide-react"
// import { useState } from "react"

// export default function SignIn() {
//   const [showPassword, setShowPassword] = useState(false)

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-black via-[#060b1a] to-black flex items-center justify-center px-6">
//       <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

//         {/* ================= LEFT : SIGN IN ================= */}
//         <div className="flex justify-center">
//           <div className="w-full max-w-md rounded-2xl bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-8">

//             {/* Logo */}
//             {/* Logo */}
// <div className="flex justify-center mb-8">
//   <img
//     src="/logo.png"
//     alt="ProTrac Logo"
//     className="h-14 object-contain"
//   />
// </div>


//             {/* Header */}
//             <h2 className="text-xl font-semibold text-white">Sign in</h2>
//             <p className="text-sm text-gray-400 mt-1">
//               Enter your email and password below
//               <br />
//               to log into your account
//             </p>

//             {/* Form */}
//             <form className="mt-6 space-y-4">
//               <Input
//                 label="Email"
//                 type="email"
//                 placeholder="name@example.com"
//               />

//               <PasswordInput
//                 label="Password"
//                 show={showPassword}
//                 toggle={() => setShowPassword(!showPassword)}
//               />

//               <div className="flex justify-end">
//                 <a
//                   href="#"
//                   className="text-xs text-gray-400 hover:text-gray-200"
//                 >
//                   Forgot password?
//                 </a>
//               </div>

//               <button
//                 type="submit"
//                 className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white py-2.5 font-medium"
//               >
//                 → Sign in
//               </button>
//             </form>

//             <p className="mt-6 text-xs text-center text-gray-400">
//               By clicking sign in, you agree to our{" "}
//               <a href="#" className="underline">
//                 Terms of Service
//               </a>{" "}
//               and{" "}
//               <a href="#" className="underline">
//                 Privacy Policy
//               </a>
//               .
//             </p>
//           </div>
//         </div>

//         {/* ================= RIGHT : DASHBOARD PREVIEW ================= */}
//         <div className="hidden md:flex justify-center">
//           <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
//             <img
//               src="/dashboard-preview.png"
//               alt="Dashboard Preview"
//               className="w-full max-w-xl object-cover"
//             />
//             <div className="absolute inset-0 bg-black/20" />
//           </div>
//         </div>

//       </div>
//     </div>
//   )
// }

// /* ------------------ Reusable Components ------------------ */

// function Input({
//   label,
//   type = "text",
//   ...props
// }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
//   return (
//     <div className="space-y-1">
//       <label className="text-sm text-gray-300">{label}</label>
//       <input
//         type={type}
//         className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
//         {...props}
//       />
//     </div>
//   )
// }

// function PasswordInput({
//   label,
//   show,
//   toggle,
// }: {
//   label: string
//   show: boolean
//   toggle: () => void
// }) {
//   return (
//     <div className="space-y-1">
//       <label className="text-sm text-gray-300">{label}</label>
//       <div className="relative">
//         <input
//           type={show ? "text" : "password"}
//           className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
//         />
//         <button
//           type="button"
//           onClick={toggle}
//           className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
//         >
//           {show ? <EyeOff size={16} /> : <Eye size={16} />}
//         </button>
//       </div>
//     </div>
//   )
// }
