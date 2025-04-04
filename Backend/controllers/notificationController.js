import { Notification } from "../model/notificationModel.js"
import { io } from "../server.js"

// Get notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const { userId, userType, limit = 10, page = 1, onlyUnread = false } = req.query

    // Validate required parameters
    if (!userId || !["doctor", "patient", "admin"].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type or missing user ID",
      })
    }

    // Build query
    const query = {
      recipient: userId,
      recipientModel: userType === "doctor" ? "doctor_user" : userType === "patient" ? "patient_user" : "admin_user",
    }

    // Add filter for unread notifications if requested
    if (onlyUnread === "true") {
      query.isRead = false
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Execute query with pagination and sorting
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    // Get total count for pagination
    const total = await Notification.countDocuments(query)

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      ...query,
      isRead: false,
    })

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        total,
        unreadCount,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / Number.parseInt(limit)),
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
}

// Create a new notification
export const createNotification = async (req, res) => {
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
      isRead: false,
      createdAt: new Date(),
    })

    // Emit socket event for real-time notification
    const roomName = `${recipientModel.split("_")[0]}-${recipient}`
    io.to(roomName).emit("newNotification", notification)

    res.status(201).json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error("Error creating notification:", error)
    res.status(500).json({
      success: false,
      message: "Error creating notification",
      error: error.message,
    })
  }
}

// Mark a notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params

    const notification = await Notification.findById(id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    // Check if user is authorized to mark this notification as read
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this notification",
      })
    }

    notification.isRead = true
    notification.readAt = new Date()
    await notification.save()

    res.status(200).json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
      error: error.message,
    })
  }
}

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId, userType } = req.query

    if (!userId || !["doctor", "patient", "admin"].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type or missing user ID",
      })
    }

    // Check if user is authorized
    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update these notifications",
      })
    }

    const recipientModel =
      userType === "doctor" ? "doctor_user" : userType === "patient" ? "patient_user" : "admin_user"

    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      {
        recipient: userId,
        recipientModel,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    )

    res.status(200).json({
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
}

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params

    const notification = await Notification.findById(id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    // Check if user is authorized to delete this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this notification",
      })
    }

    await notification.deleteOne()

    res.status(200).json({
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
}

