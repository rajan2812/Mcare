import jwt from "jsonwebtoken"

export const checkAuth = (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        isAuthenticated: false,
        message: "No token provided",
      })
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          isAuthenticated: false,
          message: "Invalid or expired token",
        })
      }

      res.json({
        success: true,
        isAuthenticated: true,
        userId: decoded.id,
      })
    })
  } catch (error) {
    console.error("Auth check error:", error)
    res.status(500).json({
      success: false,
      isAuthenticated: false,
      message: "Error checking authentication",
    })
  }
}

