import express, { Request, Response } from 'express';
import Doctor from '../models/DoctorModel';
import AdminNotification from '../models/AdminNotification';
import mongoose from 'mongoose';
import User from '../models/UserModel'; // Assuming you have a User model
import Patient from '../models/PatientModel'; // Assuming you have a Patient model

const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to doctor' });
}

const submitPersonalDetails = async (req: any, res: any) => {
    try {
        const { fullName, dateOfBirth, gender, country, city, phoneNo, image } = req.body;
        const userId = req.user._id;
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can submit personal details' });
        }
        let doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            const userEmail = req.user.email;
            doctor = new Doctor({ userId, email: userEmail });
        }
        doctor.personalDetails = { fullName, dateOfBirth, gender, country, city, phoneNo, image };
        doctor.status = 'pending';
        await doctor.save();
        await AdminNotification.create({
            type: 'doctor_verification',
            doctorId: doctor._id,
            message: `Doctor ${fullName} has submitted personal details for verification.`,
        });

      // Update profileCompleted status on User model
      await User.findByIdAndUpdate(userId, { profileCompleted: true });
    
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


const setupClinic = async (req: any, res: any) => {
    const userId = req.user._id;
    if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can setup clinic' });
    }
    let doctor = await Doctor.findOne({ userId });
    if (!doctor || doctor.status !== 'verified') {
        return res.status(400).json({ message: 'Doctor must be verified to set up a clinic' });
    }
        const fullName = doctor.personalDetails?.fullName || '';
        const image = doctor.personalDetails?.fullName || '';
        const city = doctor.personalDetails?.city || '';
        const country = doctor.personalDetails?.country || '';
        const specialisation = doctor.professionalDetails?.specialisation || '';
        const educationBackground = doctor.professionalDetails?.educationalBackground || '';
        const startTime = doctor.professionalDetails?.availableHours?.[0]?.startTime || '';
        const endTime = doctor.professionalDetails?.availableHours?.[0]?.endTime || '';
        const consultationFee = doctor.professionalDetails?.consultationFee || 0;
        if (!fullName || !specialisation || !educationBackground || !image) {
            return res.status(400).json({
                message: 'Doctor profile details are incomplete. Please complete your profile before setting up a clinic.',
            });
        }
    doctor.clinic = { fullName, specialisation, educationBackground, image, consultationFee, city, country, startTime, endTime };
    await doctor.save();

    res.status(200).json({ message: 'Clinic setup successfully' });
};

const getClinicDetails = async (req: any, res: any) => {
    try {
        const userId = req.user._id;
        if (req.user.role.toLowerCase() !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can access clinic data' });
        }
        const doctor = await Doctor.findOne({ userId }).select("clinic availability");
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        if (!doctor.clinic) {
            return res.status(400).json({ message: 'Clinic data is not set up yet' });
        }
        const { fullName, specialisation, educationBackground, image, consultationFee, city, country, startTime, endTime } =
            doctor.clinic;
        res.status(200).json({
            clinic: {
                fullName,
                specialisation,
                educationBackground,
                image,
                consultationFee,
                city,
                country,
                startTime,
                endTime,
            },
            availability: doctor.availability || []
        });
    } catch (error) {
        console.error("Error fetching clinic details:", error);
        res.status(500).json({ message: "An error occurred while fetching clinic details." });
    }
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

const updateDoctorPersonalDetails = async (req: any, res: any) => {
    try {
      const { fullName, dateOfBirth, gender, country, city, phoneNo, image } = req.body;
      const userId = req.user._id;
  
      if (req.user.role.toLowerCase() !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can update personal details' });
      }
  
      const doctor = await Doctor.findOne({ userId });
  
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found. Please complete registration first.' });
      }
  
      doctor.personalDetails = {
        ...doctor.personalDetails, // Preserve existing fields not being updated
        fullName,
        dateOfBirth,
        gender,
        country,
        city,
        phoneNo,
        image,
      };
  
      await doctor.save();

       // Update profileCompleted status on User model
       await User.findByIdAndUpdate(userId, { profileCompleted: true });
    
       // Return user data with updated profileCompleted status
       const updatedUser = await User.findById(userId).select('-password');
     
  
      res.status(200).json({ message: 'Personal details updated successfully' ,
        user: updatedUser
       });
    } catch (error) {
      console.error('Error in updateDoctorPersonalDetails:', error);
      res.status(500).json({ message: 'An error occurred while updating personal details' });
    }
  };

 const getDoctorDetails = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    const doctor = await Doctor.findOne({ userId });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const personalDetails = doctor.personalDetails;

    if (!personalDetails) {
      return res.status(200).json({ message: "No personal details found yet", personalDetails: null });
    }

    res.status(200).json({
      message: "Doctor personal details fetched successfully",
      personalDetails,
    });
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    res.status(500).json({ message: "An error occurred while fetching doctor details" });
  }
};

//  Get upcoming appointments for a doctor and clean up past appointments
//  @param req Request containing doctorId
//  @param res Response with upcoming appointments
 
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
        return res.status(404).json({ message: 'Doctor not found' });
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
  
  
  // Helper function to convert month name to month number
  function getMonthNumber(monthName: string): number {
    const months: { [key: string]: number } = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    
    return months[monthName.toLowerCase()] || 1; // Default to January if not found
  }

export {test, submitPersonalDetails, submitProfessionalDetails,checkVerificationStatus,setupClinic, setAvailableSlots, markSlotsAsBusy, getClinicDetails 
    , updateDoctorPersonalDetails , getDoctorDetails , getDoctorProfessionalDetails
}

