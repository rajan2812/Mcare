"use client"

import type React from "react"
import { useState} from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import axios from "axios"

const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [userType, setUserType] = useState("Patient")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [passwordStrength, setPasswordStrength] = useState("")
  const router = useRouter()

  // Initialize axios with base URL from environment variable
  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 5000, // 5 second timeout
    headers: {
      "Content-Type": "application/json",
    },
  })

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length > 7) strength += 1
    if (password.match(/[a-z]+/)) strength += 1
    if (password.match(/[A-Z]+/)) strength += 1
    if (password.match(/[0-9]+/)) strength += 1
    if (password.match(/[$@#&!]+/)) strength += 1

    switch (strength) {
      case 0:
      case 1:
        return "very weak"
      case 2:
        return "weak"
      case 3:
        return "medium"
      case 4:
        return "strong"
      case 5:
        return "very strong"
      default:
        return "weak"
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const userData = Object.fromEntries(formData.entries())

    try {
      if (!otpSent) {
        // Request OTP
        const response = await api.post("/api/auth/request-otp", {
          email: userData.email,
          role: userType.toLowerCase(),
        })

        if (response.data.success) {
          setOtpSent(true)
          setError("OTP sent to your email. Please check and enter below.")
        } else {
          setError(response.data.message || "Failed to send OTP")
        }
      } else {
        // Verify OTP and complete login/signup
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register"
        const response = await api.post(endpoint, {
          ...userData,
          role: userType.toLowerCase(),
          otp: otp,
        })

        if (response.data.token) {
          localStorage.setItem("token", response.data.token)
          localStorage.setItem("user", JSON.stringify(response.data.user))
          router.push(response.data.user.role === "doctor" ? "/doctor-dashboard" : "/patient-dashboard")
        } else {
          setError("Invalid response from server")
        }
      }
    } catch (error) {
      console.error("Error:", error)
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Network error. Please try again.")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const GoogleButton = ({ text }: { text: string }) => (
    <button
      type="button"
      className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-300"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span className="text-gray-700 font-medium">{text}</span>
    </button>
  )

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="absolute inset-0 bg-texture opacity-10 pointer-events-none"></div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-white bg-opacity-90 shadow-2xl rounded-2xl relative z-10"
      >
        <motion.h1
          className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent animate-gradient"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Welcome to Mcare
        </motion.h1>
        <motion.p
          className="text-center text-gray-500 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Your Health, Our Priority
        </motion.p>

        <div className="flex justify-center mb-6">
          <button
            className={`px-6 py-2 w-1/2 ${
              isLogin ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
            } rounded-l-full focus:outline-none transition-colors duration-300 ease-in-out`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`px-6 py-2 w-1/2 ${
              !isLogin ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
            } rounded-r-full focus:outline-none transition-colors duration-300 ease-in-out`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <motion.div
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit}>
            {isLogin ? (
              <>
                <div className="flex justify-center mb-6">
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 ${
                      userType === "Patient" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-l-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => setUserType("Patient")}
                  >
                    Patient
                  </button>
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 ${
                      userType === "Doctor" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-r-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => setUserType("Doctor")}
                  >
                    Doctor
                  </button>
                </div>

                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>

                <div className="mb-6 relative">
                  <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      const newPassword = e.target.value
                      setPassword(newPassword)
                      setPasswordStrength(checkPasswordStrength(newPassword))
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-gray-500 focus:outline-none"
                  >
                    {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="firstName" className="block text-gray-700 text-sm font-semibold mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    placeholder="Enter your first name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="lastName" className="block text-gray-700 text-sm font-semibold mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    placeholder="Enter your last name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>

                <div className="mb-6 relative">
                  <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      const newPassword = e.target.value
                      setPassword(newPassword)
                      setPasswordStrength(checkPasswordStrength(newPassword))
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-gray-500 focus:outline-none"
                  >
                    {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>
                <div className="flex justify-center mb-6">
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 ${
                      userType === "Patient" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-l-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => setUserType("Patient")}
                  >
                    Patient
                  </button>
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 ${
                      userType === "Doctor" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-r-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => setUserType("Doctor")}
                  >
                    Doctor
                  </button>
                </div>
              </>
            )}

            {otpSent && (
              <div className="mb-6">
                <label htmlFor="otp" className="block text-gray-700 text-sm font-semibold mb-2">
                  OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                />
              </div>
            )}

            {password && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Password Strength:</span>
                  <span
                    className={`text-sm font-medium ${
                      passwordStrength === "very strong" || passwordStrength === "strong"
                        ? "text-green-500"
                        : passwordStrength === "medium"
                          ? "text-yellow-500"
                          : "text-red-500"
                    }`}
                  >
                    {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      passwordStrength === "very strong"
                        ? "bg-green-500 w-full"
                        : passwordStrength === "strong"
                          ? "bg-green-400 w-4/5"
                          : passwordStrength === "medium"
                            ? "bg-yellow-500 w-3/5"
                            : passwordStrength === "weak"
                              ? "bg-red-400 w-2/5"
                              : "bg-red-500 w-1/5"
                    }`}
                  ></div>
                </div>
                <ul className="mt-2 text-xs text-gray-600 space-y-1">
                  <li className={password.length > 7 ? "text-green-500" : ""}>• At least 8 characters</li>
                  <li className={password.match(/[a-z]/) ? "text-green-500" : ""}>• At least one lowercase letter</li>
                  <li className={password.match(/[A-Z]/) ? "text-green-500" : ""}>• At least one uppercase letter</li>
                  <li className={password.match(/[0-9]/) ? "text-green-500" : ""}>• At least one number</li>
                  <li className={password.match(/[$@#&!]/) ? "text-green-500" : ""}>
                    • At least one special character ($@#&!)
                  </li>
                </ul>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
              disabled={loading}
            >
              {loading ? "Processing..." : otpSent ? "Verify OTP" : `${isLogin ? "Log In" : "Sign Up"} as ${userType}`}
            </button>

            {error && <div className="mt-4 text-red-500 text-center">{error}</div>}

            <div className="mt-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR {isLogin ? "SIGN IN" : "SIGN UP"} WITH</span>
                </div>
              </div>
              <GoogleButton text={isLogin ? "LOGIN WITH GOOGLE" : "SIGN UP WITH GOOGLE"} />
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Login

