import express, { Request, Response } from 'express';
import Doctor from '../models/DoctorModel';
import AdminNotification from '../models/AdminNotification';
import { v2 as cloudinary } from "cloudinary";
import mongoose from 'mongoose';
import User from '../models/UserModel'; // Assuming you have a User model
import Patient from '../models/PatientModel'; // Assuming you have a Patient model
import Appointment from '../models/AppointmentModel';
import Prescription, { IPrescription } from '../models/PrescriptionModel';

const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to doctor' });
}

const submitPersonalDetails = async (req: any, res: any) => {
    try {
        const { fullName, dateOfBirth, gender, country, city, phoneNo, image } = req.body;
        console.log("request body personal details" ,req.body);
        const userId = req.user._id;
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can submit personal details' });
        }
        let doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            const userEmail = req.user.email;
            doctor = new Doctor({ userId, email: userEmail });
        }

      let uploadedImageUrl = "";  
         // 🔹 If image provided, upload to Cloudinary
      if (image) {
        const uploadedResponse = await cloudinary.uploader.upload(image);
        uploadedImageUrl = uploadedResponse.secure_url;
      }

        doctor.personalDetails = { fullName, dateOfBirth, gender, country, city, phoneNo, image :uploadedImageUrl };
        doctor.status = 'pending';
        doctor.clinic = { ...doctor.clinic, fullName, country , city, image :uploadedImageUrl }
        await doctor.save();
        console.log('Doctor personal details saved:', doctor);
        await AdminNotification.create({
            type: 'doctor_verification',
            doctorId: doctor._id,
            message: `Doctor ${fullName} has submitted personal details for verification.`,
        });

      // Update profileCompleted status on User model
      await User.findByIdAndUpdate(userId, { profileCompleted: true, profilePicture: image });
    
      // Return user data with updated profileCompleted status
      const updatedUser = await User.findById(userId).select('-password');
    
        res.status(200).json({ message: 'Personal details submitted successfully' ,
          user: updatedUser
         });
    } catch (error) {
        console.error('Error in submitPersonalDetails:', error);
        res.status(500).json({ message: 'An error occurred while submitting personal details' });
    }
};

const getDoctorProfessionalDetails = async (req: any, res: any) => {
    try {
      const userId = req.user._id;
  
      if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: "Only doctors can access professional details" });
      }
  
      const doctor = await Doctor.findOne({ userId });
  
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
  
      const professionalDetails = doctor.professionalDetails;
  
      if (!professionalDetails) {
        return res.status(200).json({ 
          message: "No professional details found yet", 
          professionalDetails: null 
        });
      }
  
      res.status(200).json({
        message: "Doctor professional details fetched successfully",
        professionalDetails,
      });
    } catch (error) {
      console.error("Error fetching doctor professional details:", error);
      res.status(500).json({ message: "An error occurred while fetching doctor professional details" });
    }
  };

  const submitProfessionalDetails = async (req: any, res: any) => {
    const { specialisation, pmdcNumber, educationalBackground, licenseImage, cnicNumber, availableHours, consultationFee, bankDetails } = req.body;
    console.log("request body professional details" ,req.body);
    const userId = req.user._id;
    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can submit personal details' });
    }
    let doctor = await Doctor.findOne({ userId });
    if (!doctor) {
            const userEmail = req.user.email;
            doctor = new Doctor({ userId, email: userEmail });
        }
    const fullName = doctor.personalDetails?.fullName || '';
    doctor.professionalDetails = { specialisation, pmdcNumber, educationalBackground, licenseImage, cnicNumber, availableHours, consultationFee, bankDetails };
    doctor.status = 'pending';
    doctor.clinic = { ...doctor.clinic, specialisation, educationBackground: educationalBackground ,consultationFee, startTime: availableHours.startTime, endTime: availableHours.endTime }
    await doctor.save();
    await AdminNotification.create({
        type: 'doctor_verification',
        doctorId: doctor._id,
        message: `${specialisation} Doctor ${fullName} has submitted personal details for verification.`,
    });
    

    res.status(200).json({ message: 'Professional details submitted successfully' });
};

const checkVerificationStatus = async (req: any, res: any) => {
    const userId = req.user._id;
    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can check their status' });
    }
    let doctor = await Doctor.findOne({ userId });
    if (!doctor) {
        const userEmail = req.user.email;
        doctor = new Doctor({ userId, email: userEmail });
    }
    res.status(200).json({ status: doctor.status });
};


const setAvailableSlots = async (req: any, res: any) => {
    try {
        const userId = req.user._id;
        const { availability } = req.body;
        if (req.user.role.toLowerCase() !== "doctor") {
            return res.status(403).json({ message: "Only doctors can set availability" });
        }
        const doctor = await Doctor.findOne({ userId });
        if (!doctor || doctor.status !== "verified") {
            return res.status(400).json({ message: "Doctor must be verified to set availability" });
        }
        if (!Array.isArray(availability)) {
            return res.status(400).json({ message: "Invalid data format. Expected an array of availability objects." });
        }
        availability.forEach(({ date, slots }) => {
            const existingAvailability = doctor.availability.find(avail => avail.date === date);
            if (existingAvailability) {
                existingAvailability.slots = slots.map((slot:any) => ({
                    time: slot.time,
                    status: "available",
                }));
            } else {
                doctor.availability.push({
                    date,
                    slots: slots.map((slot:any) => ({
                        time: slot.time,
                        status: "available",
                    })),
                });
            }
        });
        await doctor.save();
        res.status(200).json({ message: "Availability updated successfully" });
    } catch (error) {
        console.error("Error in setAvailableSlots:", error);
        res.status(500).json({ message: "An error occurred while setting availability" });
    }
};

const markSlotsAsBusy = async (req: any, res: any) => {
    try {
        const userId = req.user._id;
        const { schedules } = req.body;
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can mark slots as busy' });
        }
        const doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        const results = [];
        for (const schedule of schedules) {
            const { date, times } = schedule;
            const availability = doctor.availability.find((avail: any) => avail.date === date);
            if (!availability) {
                results.push({ date, markedBusy: [], alreadyBooked: [], notFound: times });
                continue;
            }
            const dateResults: any = {
                date,
                markedBusy: [],
                alreadyBooked: [],
                notFound: []
            };
            for (const time of times) {
                const slot = availability.slots.find((slot: any) => slot.time === time);
                if (!slot) {
                    dateResults.notFound.push(time);
                } else if (slot.status === 'booked') {
                    dateResults.alreadyBooked.push(time);
                } else {
                    slot.status = 'busy';
                    dateResults.markedBusy.push(time);
                }
            }
            results.push(dateResults);
        }
        await doctor.save();
        res.status(200).json({
            message: 'Slots marked as busy successfully',
            results
        });
    } catch (error) {
        console.error('Error in markSlotsAsBusy:', error);
        res.status(500).json({ message: 'An error occurred while marking slots as busy' });
    }
};


const getClinicDetails = async (req: any, res: any) => {
    try {
      const doctorId = req.user._id; // Corrected from req.user.id -> req.user._id
      const doctor = await Doctor.findOne({ userId: doctorId });
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
  
      return res.status(200).json({ success: true, clinic: doctor.clinic || {} });
    } catch (error) {
      console.error('Error in getClinicDetails:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  const saveClinicDetails = async (req: any, res: any) => {
    try {
      const doctorId = req.user._id;
      const {
        fullName,
        specialisation,
        educationBackground,
        description,
        image, // yeh aa raha req.body se
        consultationFee,
        city,
        country,
        startTime,
        endTime,
      } = req.body;
  
      let doctor = await Doctor.findOne({ userId: doctorId });
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
  
      let uploadedImageUrl = "";
  
      // 🔹 If image provided, upload to Cloudinary
      if (image) {
        const uploadedResponse = await cloudinary.uploader.upload(image);
        uploadedImageUrl = uploadedResponse.secure_url;
      }
  
      // 🔹 Update clinic details
      doctor.clinic = {
        fullName,
        specialisation,
        educationBackground,
        description,
        image: uploadedImageUrl || doctor.clinic?.image || "", // agar naya image nahi mila toh purana rahe
        consultationFee,
        city,
        country,
        startTime,
        endTime,
      };
  
      await doctor.save();
  
      return res.status(200).json({ success: true, clinic: doctor.clinic });
    } catch (error) {
      console.error('Error in saveClinicDetails:', error);
      return res.status(500).json({ message: 'Failed to save clinic details' });
    }
  };

  // const getAvailability = async (req: any, res: any) => {
  //   try {
  //     const userId = req.user._id;
  
  //     if (req.user.role.toLowerCase() !== "doctor") {
  //       return res.status(403).json({ message: "Only doctors can view availability" });
  //     }
  
  //     const doctor = await Doctor.findOne({ userId });
  
  //     if (!doctor) {
  //       return res.status(404).json({ message: "Doctor not found" });
  //     }
  
  //     const currentDate = new Date(); // Current Date and Time
  
  //     const availabilityDetails = doctor.availability
  //       .filter((day: any) => {
  //         const slotDate = new Date(day.date);
  //         // Only include slots with date today or future
  //         return slotDate >= new Date(currentDate.toDateString());
  //       })
  //       .map((day: any) => {
  //         const availableSlots = day.slots.filter((slot: any) => slot.status === "available").map((slot: any) => slot.time);
  //         const busySlots = day.slots.filter((slot: any) => slot.status === "busy").map((slot: any) => slot.time);
  //         const bookedSlots = day.slots.filter((slot: any) => slot.status === "booked").map((slot: any) => slot.time);
  
  //         return {
  //           date: day.date,
  //           availableSlots,
  //           busySlots,
  //           bookedSlots
  //         };
  //       });
  
  //     return res.status(200).json({ success: true, availability: availabilityDetails });
  //   } catch (error) {
  //     console.error("Error in getAvailability:", error);
  //     return res.status(500).json({ message: "Failed to fetch availability" });
  //   }
  // };



const getAvailabilityold = async (req: any, res: any) => {
  try {
    const userId = req.user._id;

    if (req.user.role.toLowerCase() !== "doctor") {
      return res.status(403).json({ message: "Only doctors can view availability" });
    }

    const doctor = await Doctor.findOne({ userId });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Debug: Log the full availability data to see what's actually in the database
    console.log("Doctor availability data:", JSON.stringify(doctor.availability, null, 2));

    const currentDate = new Date(); // Current Date and Time
    const currentDateStr = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    const availabilityDetails = doctor.availability
      .filter((day: any) => {
        // If stored as string, handle accordingly
        const dateCompare = new Date(day.date);
        const today = new Date(currentDate.toDateString());
        return dateCompare >= today;
      })
      .map((day: any) => {
        // Debug: Log each day's slots to see statuses
        console.log(`Slots for ${day.date}:`, day.slots);

        const availableSlots = day.slots.filter((slot: any) => 
          slot.status === "available").map((slot: any) => slot.time);
        
        const busySlots = day.slots.filter((slot: any) => 
          slot.status === "busy").map((slot: any) => slot.time);
        
        const bookedSlots = day.slots.filter((slot: any) => 
          slot.status === "booked").map((slot: any) => slot.time);

        // Debug: Log the filtered slot counts
        console.log(`For date ${day.date}: available: ${availableSlots.length}, busy: ${busySlots.length}, booked: ${bookedSlots.length}`);

        return {
          date: day.date,
          availableSlots,
          busySlots,
          bookedSlots
        };
      });

    return res.status(200).json({ success: true, availability: availabilityDetails });
  } catch (error) {
    console.error("Error in getAvailability:", error);
    return res.status(500).json({ message: "Failed to fetch availability" });
  }
};

const getAvailability = async (req: any, res: any) => {
  try {
    const userId = req.user._id;

    if (req.user.role.toLowerCase() !== "doctor") {
      return res.status(403).json({ message: "Only doctors can view availability" });
    }

    const doctor = await Doctor.findOne({ userId });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Get today's date in YYYY-MM-DD format (without time component)
    const today = new Date();
    const todayFormatted = today.getFullYear() + '-' + 
                          String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(today.getDate()).padStart(2, '0');
    
    console.log("Today's formatted date for comparison:", todayFormatted);

    const availabilityDetails = doctor.availability
      .filter((day) => {
        // Extract just the date part regardless of format
        // If day.date is a full ISO string, this will extract just the YYYY-MM-DD part
     // Extract just the date part regardless of format
        // If day.date is a full ISO string, this will extract just the YYYY-MM-DD part
        const dayDate = typeof day.date === 'string' ? day.date.split('T')[0] : null;
        
        if (!dayDate) {
          console.log("Could not extract date from:", day.date);
          return false;
        }
        
        console.log(`Comparing date: ${dayDate} with today: ${todayFormatted}`);
        return dayDate >= todayFormatted;
      })
      .map((day) => {
        const availableSlots = day.slots.filter((slot) => 
          slot.status === "available").map((slot) => slot.time);
        
        const busySlots = day.slots.filter((slot) => 
          slot.status === "busy").map((slot) => slot.time);
        
        const bookedSlots = day.slots.filter((slot) => 
          slot.status === "booked").map((slot) => slot.time);

        return {
          date: day.date?.split('T')[0], // Send just the YYYY-MM-DD part back to frontend
          availableSlots,
          busySlots,
          bookedSlots
        };
      });

    return res.status(200).json({ success: true, availability: availabilityDetails });
  } catch (error) {
    console.error("Error in getAvailability:", error);
    return res.status(500).json({ message: "Failed to fetch availability" });
  }
};

export const getUpcomingAppointments = async (req: Request, res: Response) => {
    try {
      // Handle doctorId from either params or query, ensuring it's a string
      const doctorId = req.params.doctorId || 
                      (req.query.doctorId ? String(req.query.doctorId) : undefined);
  
      if (!doctorId) {
        return res.status(400).json({ message: 'Doctor ID is required' });
      }
  
      // Now we can safely check if it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({ message: 'Invalid Doctor ID format' });
      }
  
      // Find the doctor
      const doctor = await Doctor.findOne({userId: doctorId});
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found or not Verified. Check Clinic' });
      }
  
      const currentDate = new Date();
      const upcomingAppointments = [];
      const appointmentsToKeep = [];
  
      // Process each appointment
      if (doctor.appointments && Array.isArray(doctor.appointments)) {
        for (const appointment of doctor.appointments) {
          // Skip appointments with missing data
          if (!appointment.date || !appointment.time || typeof appointment.date !== 'string' || typeof appointment.time !== 'string') {
            continue;
          }
          
          try {
            let appointmentDateTime: Date;
            
            // Check date format and parse accordingly
            if (appointment.date.includes('-')) {
              // Format: YYYY-MM-DD (e.g., 2025-04-26)
              const [year, month, day] = appointment.date.split('-').map(num => parseInt(num, 10));
              
              // Parse time (assuming format like "9:00am - 10:00am")
              const timeStart = appointment.time.split(' - ')[0];
              const isPM = timeStart.toLowerCase().includes('pm');
              const isAM = timeStart.toLowerCase().includes('am');
              
              // Extract hours and minutes from time
              const timeWithoutAMPM = timeStart.replace(/am|pm/i, '').trim();
              const [hourStr, minuteStr] = timeWithoutAMPM.split(':');
              
              let hour = parseInt(hourStr, 10);
              let minute = minuteStr ? parseInt(minuteStr, 10) : 0;
              
              // Convert to 24-hour format
              if (isPM && hour < 12) hour += 12;
              if (isAM && hour === 12) hour = 0;
              
              appointmentDateTime = new Date(year, month - 1, day, hour, minute);
            } else {
              // Format: "15th October,2024"
              const dateParts = appointment.date.split(/[,\s]+/);
              if (dateParts.length < 3) continue; // Skip if date format is invalid
              
              const [day, month, year] = dateParts;
              const cleanMonth = month.replace(/(?:st|nd|rd|th)$/, '');
              const appointmentMonth = getMonthNumber(cleanMonth);
              const appointmentDay = parseInt(day.replace(/\D/g, ''));
              const appointmentYear = parseInt(year);
              
              if (isNaN(appointmentDay) || isNaN(appointmentYear)) continue;
              
              // Parse time (assuming format like "01:30pm - 02:30pm")
              const timeParts = appointment.time.split(' - ');
              if (timeParts.length < 1) continue;
              
              const timeStart = timeParts[0];
              if (timeStart.length < 4) continue;
              
              const isPM = timeStart.toLowerCase().includes('pm');
              const isAM = timeStart.toLowerCase().includes('am');
              
              if (!isPM && !isAM) continue;
              
              const timeWithoutAMPM = timeStart.replace(/am|pm/i, '').trim();
              const timeComponents = timeWithoutAMPM.split(':');
              
              let hour = parseInt(timeComponents[0]);
              let minute = 0;
              
              if (timeComponents.length > 1) {
                minute = parseInt(timeComponents[1]);
              }
              
              if (isNaN(hour)) continue;
              
              // Convert to 24-hour format
              if (isPM && hour < 12) hour += 12;
              if (isAM && hour === 12) hour = 0;
              
              appointmentDateTime = new Date(appointmentYear, appointmentMonth - 1, appointmentDay, hour, minute);
            }
            
            console.log("Appointment date/time parsed:", appointmentDateTime);
            console.log("Current date:", currentDate);
            console.log("Is future appointment:", appointmentDateTime > currentDate);
  
            // Check if appointment is in the future
            if (appointmentDateTime > currentDate) {
              // Keep valid appointments
              appointmentsToKeep.push(appointment);
              
              // Add to upcoming appointments with patient info
              try {
                let patientName = "Unknown";
                
                if (appointment.patientId) {
                  // Try to get patient information
                  const patient = await Patient.findOne({ userId: appointment.patientId });
                  if (patient && patient.personalInformation && patient.personalInformation.fullName) {
                    patientName = patient.personalInformation.fullName;
                  } else {
                    // Fall back to User model if patient model doesn't have the name
                    const user = await User.findById(appointment.patientId);
                    if (user && user.name) {
                      patientName = user.name;
                    }
                  }
                }
                
                upcomingAppointments.push({
                  appointmentId: appointment.appointmentId,
                  patientId: appointment.patientId,
                  date: appointment.date,
                  time: appointment.time,
                  patient: patientName
                });
              } catch (patientError) {
                console.error('Error fetching patient details:', patientError);
                // Still include the appointment but with unknown patient
                upcomingAppointments.push({
                  appointmentId: appointment.appointmentId,
                  patientId: appointment.patientId,
                  date: appointment.date,
                  time: appointment.time,
                  patient: "Unknown"
                });
              }
            }
          } catch (appointmentError) {
            // Log error but continue processing other appointments
            console.error('Error processing appointment:', appointmentError);
            continue;
          }
        }
      }
  
      // Update doctor document if any appointments were removed
      if (doctor.appointments && appointmentsToKeep.length !== doctor.appointments.length) {
        await Doctor.findByIdAndUpdate(doctor._id, { appointments: appointmentsToKeep });
      }
  
      console.log("Final upcoming appointments:", upcomingAppointments);
  
      return res.status(200).json({
        success: true,
        count: upcomingAppointments.length,
        data: upcomingAppointments
      });
      
    } catch (error) {
      console.error('Error in getUpcomingAppointments:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  

export const getDetailsForPrescription = async (req: any, res: any) => {
  try {
      const { appointmentId } = req.params;
      
      // Find appointment
      const appointment = await Appointment.findOne({ appointmentId });
      
      if (!appointment) {
          return res.status(404).json({ message: 'Appointment not found' });
      }
      
      // Get patient details
      const patient = await Patient.findOne({ userId: appointment.patientId });
      
      if (!patient) {
          return res.status(404).json({ message: 'Patient not found' });
      }
      
      // Get doctor details
      const doctor = await Doctor.findOne({ userId: appointment.doctorId });
      
      if (!doctor) {
          return res.status(404).json({ message: 'Doctor not found' });
      }
      
      // Compile prescription details
      const prescriptionDetails = {
          appointmentId: appointment.appointmentId,
          date: appointment.date,
          time: appointment.time,
          patientInfo: {
              patientId: appointment.patientId,
              name: appointment.patientName,
              gender: patient.personalInformation?.gender || 'Not specified',
              age: patient.personalInformation?.age || 'Not specified'
          },
          doctorInfo: {
              doctorId: appointment.doctorId,
              name: appointment.doctorName,
              specialisation: doctor.professionalDetails?.specialisation || 'Not specified',
              pmdcNumber: doctor.professionalDetails?.pmdcNumber || 'Not specified'
          }
      };
      
      res.status(200).json(prescriptionDetails);
  } catch (error) {
      console.error('Error in getDetailsForPrescription:', error);
      res.status(500).json({ message: 'An error occurred while fetching prescription details' });
  }
}; 
  
  // Helper function to convert month name to month number
  function getMonthNumber(monthName: string): any {
    const months: { [key: string]: number } = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
  }
  


  export const savePrescription = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        doctorName,
        doctorId,
        patientId,
        patientName,
        patientGender,
        patientAge,
        date,
        appointmentId,
        prescription
      } = req.body;
  
      // Validate required fields
      if (!doctorName || !doctorId || !patientId || !patientName || !patientGender || !patientAge || !appointmentId || !prescription) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }
  
      // Create a new prescription document
      const newPrescription = new Prescription({
        prescriptionId: appointmentId,
        date: date ? new Date(date) : new Date(),
        doctorName,
        doctorId,
        patientId,
        patientName,
        patientGender,
        patientAge,
        prescription: prescription.filter((item: { medicine: string; instructions: string }) => 
          item.medicine.trim() !== "" && item.instructions.trim() !== ""
        ),
        appointmentId
      });
  
      // Save the prescription to the database
      const savedPrescription = await newPrescription.save();
  
      res.status(201).json({
        success: true,
        data: savedPrescription,
        message: 'Prescription saved successfully'
      });
    } catch (error) {
      console.error('Error saving prescription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save prescription',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  export const getReviews = async (req: Request, res: Response) => {
    try {
      const doctorId = req.query.doctorId as string;
      
      // Validate doctorId
      if (!doctorId) {
        return res.status(400).json({ success: false, message: 'Doctor ID is required' });
      }
  
      // Pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const skip = (page - 1) * limit;
  
      // Get total count for pagination
      const total = await Appointment.countDocuments({
        doctorId,
        rating: { $ne: null }, // Only count appointments with ratings
        status: 'completed' // Only completed appointments can have reviews
      });
  
      // Count five-star ratings
      const fiveStarCount = await Appointment.countDocuments({
        doctorId,
        rating: 5, // Only count 5-star ratings
        status: 'completed'
      });
  
      // Calculate average rating
      const ratingStats = await Appointment.aggregate([
        {
          $match: {
            doctorId: mongoose.Types.ObjectId.isValid(doctorId) 
              ? new mongoose.Types.ObjectId(doctorId) 
              : doctorId,
            rating: { $ne: null },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' }
          }
        }
      ]);
  
      const averageRating = ratingStats.length > 0 ? ratingStats[0].averageRating : 0;
  
      // Find completed appointments with ratings for the specified doctor
      const appointments = await Appointment.find({
        doctorId,
        rating: { $ne: null }, // Only include appointments that have ratings
        status: 'completed' // Only completed appointments
      })
        .select('patientName rating review createdAt')
        .sort({ createdAt: -1 }) // Sort by most recent first
        .skip(skip)
        .limit(limit);
  
      // Transform the data for the frontend
      const reviews = appointments.map(appointment => ({
        _id: appointment._id,
        patientName: appointment.patientName,
        rating: appointment.rating,
        review: appointment.review,
        date: appointment.createdAt
      }));
  
      return res.status(200).json({
        success: true,
        total,
        fiveStarCount,
        averageRating,
        page,
        totalPages: Math.ceil(total / limit),
        reviews
      });
    } catch (error) {
      console.error('Error in getReviews:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while fetching reviews'
      });
    }
  };
 
  export const getReviewsForChart = async (req: any, res: any) => {
    try {
      // Get the doctor ID from the authenticated user
      const doctorId = req.user?._id;
      
      if (!doctorId) {
        return res.status(400).json({ success: false, message: 'Doctor ID is required' });
      }
  
      // Count total reviews
      const total = await Appointment.countDocuments({
        doctorId,
        rating: { $ne: null }, // Only count appointments with ratings
        status: 'completed' // Only completed appointments can have reviews
      });
  
      // Count five-star ratings
      const fiveStarCount = await Appointment.countDocuments({
        doctorId,
        rating: 5, // Only count 5-star ratings
        status: 'completed'
      });
  
      // Calculate average rating
      const ratingStats = await Appointment.aggregate([
        {
          $match: {
            doctorId: mongoose.Types.ObjectId.isValid(doctorId) 
              ? new mongoose.Types.ObjectId(doctorId) 
              : doctorId,
            rating: { $ne: null },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' }
          }
        }
      ]);
  
      const averageRating = ratingStats.length > 0 ? ratingStats[0].averageRating : 0;
  
      // Return only the chart data without the reviews list
      return res.status(200).json({
        success: true,
        total,
        fiveStarCount,
        averageRating
      });
    } catch (error) {
      console.error('Error in getReviewsForChart:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while fetching review statistics'
      });
    }
  };

  export const getPrivateReviews = async (req: any, res: any)=> {
    try {
      const doctorId = req.user?._id;
      console.log('this is doctorId :',doctorId)
  
      const doctor = await Doctor.findOne({ userId: doctorId });
      
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found',
        });
      }
  
      // Return private reviews
      return res.status(200).json({
        success: true,
        privateReviews: doctor.privateReviews.map(review => ({
          _id: review._id,
          patientId: review.patientId,
          patientName: review.patientName,
          privateReview: review.privateReview
        }))
      });
    } catch (error) {
      console.error('Error getting private reviews:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get private reviews',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
  
  // Delete a private review
  export const deletePrivateReview = async (req: any, res: any): Promise<Response> => {
    try {
      const doctorId = req.user._id;
      const { reviewId } = req.params;
  
      if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Valid review ID is required',
        });
      }
  
      const doctor = await Doctor.findOne({ userId: doctorId });
      
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found',
        });
      }
  
      // Find the index of the review to delete
      const reviewIndex = doctor.privateReviews.findIndex(
        (review) => review._id.toString() === reviewId
      );
  
      if (reviewIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }
  
      // Remove the review from the array
      doctor.privateReviews.splice(reviewIndex, 1);
      
      // Save the updated doctor document
      await doctor.save();
  
      return res.status(200).json({
        success: true,
        message: 'Private review deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting private review:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete private review',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };


export {test, submitPersonalDetails, submitProfessionalDetails,checkVerificationStatus, getDoctorProfessionalDetails, setAvailableSlots, markSlotsAsBusy,getClinicDetails, saveClinicDetails,getAvailability }

