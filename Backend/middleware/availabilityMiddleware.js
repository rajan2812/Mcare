import jwt from "jsonwebtoken"

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
      isAuthenticated: false,
    })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
        isAuthenticated: false,
      })
    }

    req.user = decoded
    next()
  })
}

export const checkUserType = (allowedTypes) => {
  return (req, res, next) => {
    try {
      // Try to get user from headers
      let user = null

      if (req.headers["user"]) {
        try {
          user = JSON.parse(req.headers["user"])
        } catch (e) {
          console.error("Error parsing user from headers:", e)
        }
      }

      // If not in headers, try to get from req.user
      if (!user && req.user) {
        user = req.user
      }

      console.log("User type check:", {
        user: user ? { id: user.id, userType: user.userType || user.role } : null,
        allowedTypes,
      })

      // Check if user exists and has the right type
      if (
        !user ||
        (!user.userType && !user.role) ||
        !(allowedTypes.includes(user.userType) || allowedTypes.includes(user.role))
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access",
          isAuthenticated: false,
        })
      }

      // Add user to req if not already there
      if (!req.user) {
        req.user = user
      }

      next()
    } catch (error) {
      console.error("Error in checkUserType middleware:", error)
      return res.status(500).json({
        success: false,
        message: "Server error in authorization",
        isAuthenticated: false,
      })
    }
  }
}

export const protectRoute = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
      redirectTo: "/login",
    })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
        redirectTo: "/login",
      })
    }

    req.user = decoded
    next()
  })
}

