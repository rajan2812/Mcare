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

    // If user info is provided in headers, merge it with decoded token
    try {
      // Check for user header
      const userHeader = req.headers["user"]
      if (userHeader) {
        const userInfo = JSON.parse(userHeader)
        // Merge user info from header with decoded token
        req.user = { ...req.user, ...userInfo }
      }

      // Also check for user-role header as a fallback
      const roleHeader = req.headers["user-role"]
      if (roleHeader && (!req.user.role || !req.user.userType)) {
        req.user.role = roleHeader
        req.user.userType = roleHeader
        console.log(`Added role from header: ${roleHeader}`)
      }

      // Log the complete user object for debugging
      console.log("Authenticated user:", req.user)
    } catch (error) {
      console.error("Error parsing user headers:", error)
    }

    next()
  })
}

export const checkUserType = (allowedTypes) => {
  return (req, res, next) => {
    // First check if user type is in the decoded token
    if (req.user && req.user.userType && allowedTypes.includes(req.user.userType)) {
      return next()
    }

    // If not in token, check if it's in the user header
    try {
      const userHeader = req.headers["user"]
      if (userHeader) {
        const userInfo = JSON.parse(userHeader)
        if (userInfo.userType && allowedTypes.includes(userInfo.userType)) {
          return next()
        }
      }
    } catch (error) {
      console.error("Error parsing user header for authorization:", error)
    }

    return res.status(403).json({
      success: false,
      message: "Unauthorized access",
      isAuthenticated: false,
    })
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

    // If user info is provided in headers, merge it with decoded token
    try {
      const userHeader = req.headers["user"]
      if (userHeader) {
        const userInfo = JSON.parse(userHeader)
        // Merge user info from header with decoded token
        req.user = { ...req.user, ...userInfo }
      }
    } catch (error) {
      console.error("Error parsing user header in protectRoute:", error)
    }

    next()
  })
}

