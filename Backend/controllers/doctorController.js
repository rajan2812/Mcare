import { DoctorUser } from "../model/usermodal.js"
import { Availability } from "../model/availabilityModel.js"

export const getVerifiedDoctors = async (req, res) => {
  try {
    console.log("Getting verified doctors")

    // Get query parameters for filtering
    const { specialization, consultationType } = req.query

    // Base query for verified and profile completed doctors
    const query = {
      verificationStatus: "approved",
      isProfileCompleted: true,
    }

    // Add specialization filter if provided
    if (specialization && specialization !== "All") {
      query.specializations = specialization
    }

    console.log("Query:", query)

    // Get doctors matching the criteria
    const doctors = await DoctorUser.find(query).select("-password -documents -requiredDocuments").lean()

    console.log(`Found ${doctors.length} doctors`)

    // Get current date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get availability for all doctors for today
    const availabilityPromises = doctors.map(async (doctor) => {
      try {
        let availability = await Availability.findOne({
          doctorId: doctor._id,
          date: today,
        }).lean()

        if (!availability) {
          // Create default availability if none exists
          // Convert workingHours to regularHours format
          const regularHours = doctor.workingHours || { start: "09:00", end: "17:00" }

          availability = {
            doctorId: doctor._id,
            date: today,
            isAvailable: true,
            regularHours: regularHours, // Use regularHours instead of workHours
            breaks: [],
            timeSlots: [],
            lastUpdated: new Date(),
          }

          // Generate default time slots
          const slots = []
          const start = new Date(`2000-01-01T${regularHours.start}`)
          const end = new Date(`2000-01-01T${regularHours.end}`)

          while (start < end) {
            slots.push({
              startTime: start.toTimeString().slice(0, 5),
              endTime: new Date(start.getTime() + 30 * 60000).toTimeString().slice(0, 5),
              isBooked: false,
              isBreak: false,
            })
            start.setMinutes(start.getMinutes() + 30)
          }

          availability.timeSlots = slots

          // Save the new availability
          const newAvailability = new Availability(availability)
          await newAvailability.save()
        }

        return availability
      } catch (error) {
        console.error(`Error getting availability for doctor ${doctor._id}:`, error)
        // Return a default availability object if there's an error
        const regularHours = doctor.workingHours || { start: "09:00", end: "17:00" }
        return {
          doctorId: doctor._id,
          date: today,
          isAvailable: true,
          regularHours: regularHours, // Use regularHours instead of workHours
          breaks: [],
          timeSlots: [],
          lastUpdated: new Date(),
        }
      }
    })

    // Handle potential errors in Promise.all
    let availabilities = []
    try {
      availabilities = await Promise.all(availabilityPromises)
    } catch (error) {
      console.error("Error fetching availabilities:", error)
      // Create default availabilities if Promise.all fails
      availabilities = doctors.map((doctor) => {
        const regularHours = doctor.workingHours || { start: "09:00", end: "17:00" }
        return {
          doctorId: doctor._id,
          date: today,
          isAvailable: true,
          regularHours: regularHours, // Use regularHours instead of workHours
          breaks: [],
          timeSlots: [],
          lastUpdated: new Date(),
        }
      })
    }

    // Transform the data to include current availability
    const formattedDoctors = doctors.map((doctor, index) => {
      const availability = availabilities[index]

      // Get current time
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)

      // Check if doctor is currently on break
      const onBreak =
        availability?.breaks?.some((breakTime) => {
          const breakStart = breakTime.startTime
          const breakEnd = breakTime.endTime
          return currentTime >= breakStart && currentTime <= breakEnd
        }) || false

      // Find next available slot
      const nextAvailableSlot = availability?.timeSlots?.find(
        (slot) => !slot.isBooked && !slot.isBreak && slot.startTime > currentTime,
      )

      // Check if doctor is available now
      const isAvailableNow =
        availability?.isAvailable &&
        !onBreak &&
        availability.regularHours?.start <= currentTime && // Use regularHours instead of workHours
        availability.regularHours?.end >= currentTime // Use regularHours instead of workHours

      const doctorData = {
        id: doctor._id,
        name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specializations[0],
        imageUrl: doctor.avatarUrl || "/placeholder.svg",
        rating: doctor.rating || 0,
        reviewCount: doctor.reviewCount || 0,
        experience: doctor.experience || "Not specified",
        location: doctor.clinicAddress?.city || "Location not specified",
        isOnline: isAvailableNow,
        consultationType: doctor.consultationType || ["video", "inPerson"],
        nextSlot: nextAvailableSlot ? nextAvailableSlot.startTime : "No slots available today",
        qualifications: doctor.qualifications || [],
        about: doctor.about || "",
        isAvailable: availability?.isAvailable ?? true,
        onBreak: onBreak,
        workingHours: availability?.regularHours || { start: "09:00", end: "17:00" }, // Map regularHours to workingHours for response
        breakEndTime: onBreak
          ? availability?.breaks?.find((b) => currentTime >= b.startTime && currentTime <= b.endTime)?.endTime
          : null,
      }

      // Filter by consultation type if provided
      if (consultationType && consultationType !== "All") {
        if (!doctorData.consultationType.includes(consultationType)) {
          return null
        }
      }

      return doctorData
    })

    // Remove null entries (filtered out by consultation type)
    const filteredDoctors = formattedDoctors.filter(Boolean)

    console.log(`Returning ${filteredDoctors.length} filtered doctors`)

    res.status(200).json({
      success: true,
      doctors: filteredDoctors,
    })
  } catch (error) {
    console.error("Error fetching verified doctors:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching doctors",
      error: error.message,
    })
  }
}

