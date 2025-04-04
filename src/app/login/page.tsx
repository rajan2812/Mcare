"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { EyeIcon, EyeOffIcon } from "lucide-react"

const API_URL = "http://localhost:4000/api/user"

const Login = () => {
  // State management
  const [isLogin, setIsLogin] = useState(true)
  const [userType, setUserType] = useState("Patient")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [otp, setOtp] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetStep, setResetStep] = useState(0) // 0: email, 1: OTP, 2: new password
  const [passwordStrength, setPasswordStrength] = useState("")

  const router = useRouter()

  // Password strength checker
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

  // Handle OTP sending
  const handleSendOTP = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP")
      }

      setOtpSent(true)
      setShowOtpInput(true)
    } catch (error: any) {
      console.error("Send OTP error:", error)
      setError(error.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  // Handle login
  const handleLogin = async (userType: "patient" | "doctor" | "admin") => {
    setError("")
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/${userType === "admin" ? "admin/login" : "login"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          userType: userType.toLowerCase(),
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      if (data.success) {
        // Store token and user data
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("isLoggedIn", "true")

        // Force a small delay to ensure localStorage is updated
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Redirect based on user type and profile completion status
        const dashboardPath =
          userType === "admin"
            ? "/admin-dashboard"
            : userType === "doctor" && !data.user.isProfileCompleted
              ? "/doctor-dashboard/complete-profile"
              : `/${userType}-dashboard`

        router.push(dashboardPath)
      } else {
        throw new Error(data.message || "Login failed")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  // Handle form submission (Login/Register)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isLogin) {
        // Login flow
        handleLogin(userType.toLowerCase() as "patient" | "doctor" | "admin")
      } else {
        // Registration flow
        if (!showOtpInput) {
          // Step 1: Collect user information and send OTP
          if (!firstName || !lastName || !email || !password) {
            throw new Error("Please fill in all fields")
          }

          // Send OTP
          await handleSendOTP()
          return // Important: Stop here after sending OTP
        } else {
          // Step 2: Verify OTP and complete registration
          if (!firstName || !lastName || !email || !password || !otp) {
            throw new Error("Please fill in all fields including OTP")
          }

          const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              firstName,
              lastName,
              email,
              password,
              userType,
              otp,
            }),
            credentials: "include",
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.message || "Registration failed")
          }

          if (data.success) {
            localStorage.setItem("token", data.token)
            localStorage.setItem("user", JSON.stringify(data.user))
            localStorage.setItem("isLoggedIn", "true")

            // Redirect based on user type and profile completion status
            const redirectPath =
              userType === "Doctor" && !data.user.isProfileCompleted
                ? "/doctor-dashboard/complete-profile"
                : `/${userType.toLowerCase()}-dashboard`
            router.push(redirectPath)
          } else {
            throw new Error(data.message || "Registration failed")
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      console.error("Form submission error:", error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle forgot password flow
  const handleForgotPassword = async () => {
    try {
      setLoading(true)
      setError("")

      if (resetStep === 0) {
        // Send OTP
        if (!email) {
          throw new Error("Email is required")
        }

        const response = await fetch(`${API_URL}/forgot-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
          credentials: "include",
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Failed to send OTP")
        }

        setResetStep(1)
        setOtpSent(true)
      } else if (resetStep === 1) {
        // Verify OTP
        if (!otp) {
          throw new Error("Please enter the OTP")
        }
        setResetStep(2)
      } else if (resetStep === 2) {
        // Reset password
        if (!newPassword || !confirmPassword) {
          throw new Error("Please enter both passwords")
        }

        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match")
        }

        if (newPassword.length < 8) {
          throw new Error("Password must be at least 8 characters long")
        }

        const response = await fetch(`${API_URL}/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
            newPassword,
          }),
          credentials: "include",
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Failed to reset password")
        }

        // Reset form and show success
        setShowForgotPassword(false)
        setResetStep(0)
        setOtp("")
        setNewPassword("")
        setConfirmPassword("")
        setIsLogin(true)
        setError("Password reset successful. Please login with your new password.")
      }
    } catch (error: any) {
      console.error("Forgot password error:", error)
      setError(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Render forgot password form
  const renderForgotPasswordForm = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>

        {resetStep === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reset-email" className="block text-gray-700 text-sm font-semibold">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        )}

        {resetStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reset-otp" className="block text-gray-700 text-sm font-semibold">
                Enter OTP
              </label>
              <input
                id="reset-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter OTP"
              />
            </div>
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        )}

        {resetStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="block text-gray-700 text-sm font-semibold">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 focus:outline-none"
                >
                  {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-gray-700 text-sm font-semibold">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setShowForgotPassword(false)
            setResetStep(0)
            setOtp("")
            setNewPassword("")
            setConfirmPassword("")
          }}
          className="w-full mt-4 text-blue-500 hover:text-blue-600"
        >
          Back to Login
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="absolute inset-0 bg-texture opacity-10 pointer-events-none"></div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-white bg-opacity-90 shadow-2xl rounded-2xl relative z-10"
      >
        {showForgotPassword ? (
          renderForgotPasswordForm()
        ) : (
          <>
            <motion.h1
              className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
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
              {isLogin ? (
                <>
                  <button
                    className={`px-6 py-2 w-1/3 ${
                      userType === "Patient" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-l-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => {
                      setUserType("Patient")
                      setShowOtpInput(false)
                      setOtpSent(false)
                    }}
                  >
                    Patient
                  </button>
                  <button
                    className={`px-6 py-2 w-1/3 ${
                      userType === "Doctor" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => {
                      setUserType("Doctor")
                      setShowOtpInput(false)
                      setOtpSent(false)
                    }}
                  >
                    Doctor
                  </button>
                  <button
                    className={`px-6 py-2 w-1/3 ${
                      userType === "Admin" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-r-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => {
                      setUserType("Admin")
                      setShowOtpInput(false)
                      setOtpSent(false)
                    }}
                  >
                    Admin
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`px-6 py-2 w-1/2 ${
                      userType === "Patient" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-l-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => {
                      setUserType("Patient")
                      setShowOtpInput(false)
                      setOtpSent(false)
                    }}
                  >
                    Patient
                  </button>
                  <button
                    className={`px-6 py-2 w-1/2 ${
                      userType === "Doctor" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    } rounded-r-full focus:outline-none transition-colors duration-300 ease-in-out`}
                    onClick={() => {
                      setUserType("Doctor")
                      setShowOtpInput(false)
                      setOtpSent(false)
                    }}
                  >
                    Doctor
                  </button>
                </>
              )}
            </div>

            <motion.div
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {isLogin ? (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-gray-700 text-sm font-semibold">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-gray-700 text-sm font-semibold">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 focus:outline-none"
                        >
                          {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {!showOtpInput ? (
                      <>
                        <div className="space-y-2">
                          <label htmlFor="firstName" className="block text-gray-700 text-sm font-semibold">
                            First Name
                          </label>
                          <input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your first name"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="lastName" className="block text-gray-700 text-sm font-semibold">
                            Last Name
                          </label>
                          <input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your last name"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="email" className="block text-gray-700 text-sm font-semibold">
                            Email
                          </label>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your email"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="password" className="block text-gray-700 text-sm font-semibold">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => {
                                const newPassword = e.target.value
                                setPassword(newPassword)
                                setPasswordStrength(checkPasswordStrength(newPassword))
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter your password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 focus:outline-none"
                            >
                              {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                            </button>
                          </div>
                        </div>

                        {password && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
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
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
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
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label htmlFor="otp" className="block text-gray-700 text-sm font-semibold">
                            Enter OTP
                          </label>
                          <input
                            id="otp"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter OTP sent to your email"
                            required
                          />
                        </div>
                        {showOtpInput && (
                          <div className="text-sm text-center mt-2">
                            <button
                              type="button"
                              onClick={handleSendOTP}
                              className="text-blue-500 hover:text-blue-600"
                              disabled={loading}
                            >
                              Resend OTP
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white py-2 rounded-lg hover:from-blue-700 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 disabled:opacity-50"
                >
                  {loading
                    ? "Processing..."
                    : isLogin
                      ? `Log In as ${userType}`
                      : showOtpInput
                        ? "Complete Registration"
                        : "Sign Up"}
                </button>

                {error && <div className="text-red-500 text-center text-sm mt-2">{error}</div>}
              </form>
            </motion.div>

            {isLogin ? (
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="w-full mt-4 text-blue-500 hover:text-blue-600"
              >
                Don't have an account? Sign Up
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="w-full mt-4 text-blue-500 hover:text-blue-600"
              >
                Already have an account? Log In
              </button>
            )}

            {isLogin && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full mt-2 text-blue-500 hover:text-blue-600"
              >
                Forgot Password?
              </button>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}

export default Login

