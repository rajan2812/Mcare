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
    const user = JSON.parse(req.headers["user"] || "{}")

    if (!user || !user.userType || !allowedTypes.includes(user.userType)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
        isAuthenticated: false,
      })
    }

    next()
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

