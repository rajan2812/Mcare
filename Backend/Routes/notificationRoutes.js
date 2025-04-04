import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import { Notification } from "../model/notificationModel.js"

const router = express.Router()

// Get user's notifications
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userType = req.user.userType
    const limit = req.query.limit ? Number.parseInt(req.query.limit) : 50
    const page = req.query.page ? Number.parseInt(req.query.page) : 1
    const skip = (page - 1) * limit

    const query = {
      recipient: userId,
      recipientModel: userType === "doctor" ? "doctor_user" : "patient_user",
    }

    // Add filter for unread notifications if requested
    if (req.query.onlyUnread === "true") {
      query.status = "unread"
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)

    // Get total count for pagination
    const total = await Notification.countDocuments(query)

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      ...query,
      status: "unread",
    })

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        unreadCount,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    })
  }
})

// Create a new notification
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { recipient, recipientModel, type, title, message, metadata } = req.body

    // Validate required fields
    if (!recipient || !recipientModel || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Create notification
    const notification = await Notification.create({
      recipient,
      recipientModel,
      type,
      title,
      message,
      metadata: metadata || {},
      status: "unread",
      createdAt: new Date(),
    })

    res.status(201).json({
      success: true,
      data: notification,
    })
  } catch (error) {
    console.error("Error creating notification:", error)
    res.status(500).json({
      success: false,
      message: "Error creating notification",
      error: error.message,
    })
  }
})

// Update the route for marking a notification as read
router.put("/:notificationId/read", authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params
    const userId = req.user.id

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true },
    )

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    res.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
      error: error.message,
    })
  }
})

// Mark all notifications as read
router.put("/mark-all-read", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userType = req.user.userType

    const result = await Notification.updateMany(
      {
        recipient: userId,
        recipientModel: userType === "doctor" ? "doctor_user" : "patient_user",
        status: "unread",
      },
      {
        status: "read",
      },
    )

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
    })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    res.status(500).json({
      success: false,
      message: "Error marking all notifications as read",
      error: error.message,
    })
  }
})

// Clear all notifications (delete all notifications for a user)
router.delete("/clear-all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const userType = req.user.userType

    const result = await Notification.deleteMany({
      recipient: userId,
      recipientModel: userType === "doctor" ? "doctor_user" : "patient_user",
    })

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} notifications`,
    })
  } catch (error) {
    console.error("Error clearing notifications:", error)
    res.status(500).json({
      success: false,
      message: "Error clearing notifications",
      error: error.message,
    })
  }
})

// Delete a notification
router.delete("/:notificationId", authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params
    const userId = req.user.id

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    })

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    await notification.deleteOne()

    res.json({
      success: true,
      message: "Notification deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting notification:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: error.message,
    })
  }
})

export default router

