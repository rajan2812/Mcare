import jwt from "jsonwebtoken"

const ADMIN_EMAIL = "g22.rajan.vinod@gnkhalsa.edu.in"
const ADMIN_PASSWORD = "admin@123"

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
        userType: decoded.userType,
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

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate admin credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: "admin",
        email: ADMIN_EMAIL,
        userType: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    )

    // Send success response
    res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: {
        id: "admin",
        email: ADMIN_EMAIL,
        userType: "admin",
      },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    res.status(500).json({
      success: false,
      message: "Error during admin login",
    })
  }
}

