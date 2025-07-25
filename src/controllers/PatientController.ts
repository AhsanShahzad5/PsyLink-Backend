import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import User from '../models/UserModel';
import bcryptjs from 'bcryptjs'
import Doctor from '../models/DoctorModel';
import Patient from '../models/PatientModel';
import MoodProgressReport from '../models/MoodReportsModel';
import Note from '../models/NotesModel';
import { v4 as uuidv4 } from 'uuid';
import Appointment from '../models/AppointmentModel'
import Prescription from '../models/PrescriptionModel';
import { v2 as cloudinary } from "cloudinary";
import mongoose from 'mongoose';
const sendEmail = require("../utils/sendEmail");

const test = (req: Request, res: Response) => {
  res.json({ message: 'welcome to patient' });
}


const getVerifiedDoctors = async (req: any, res: any) => {
  try {
    // Get current date without time component
    const currentDate = new Date();
    const todayString = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Find verified doctors
    const verifiedDoctors = await Doctor.find({ status: 'verified' })
      .select('clinic availability userId rating')
      .lean();

    // Filter out past dates and unavailable slots and calculate average rating
    const filteredDoctors = verifiedDoctors.map(doctor => {
      // Calculate average rating
      const avgRating = doctor.rating &&
        doctor.rating.TotalReviews !== undefined &&
        doctor.rating.TotalReviews !== null &&
        doctor.rating.TotalReviews > 0 &&
        doctor.rating.TotalStars !== undefined &&
        doctor.rating.TotalStars !== null
        ? (doctor.rating.TotalStars / doctor.rating.TotalReviews).toFixed(1)
        : "0.0";

      return {
        ...doctor,
        avgRating: avgRating,
        availability: doctor.availability
          // First filter out past dates
          .filter(day => {
            // Compare dates as strings in YYYY-MM-DD format
            return day.date && day.date >= todayString;
          })
          // Then filter the slots for each remaining day
          .map(day => ({
            ...day,
            slots: day.slots.filter(slot => slot.status === 'available')
          }))
          // Finally, remove days with no available slots
          .filter(day => day.slots.length > 0)
      };
    });

    res.status(200).json(filteredDoctors);
  } catch (error) {
    console.error("Error in getVerifiedDoctors:", error);
    res.status(500).json("ERROR");
  }
};

const bookAppointment = async (req: any, res: any) => {
  try {
    const { doctorId, date, time , patientId} = req.body;
    const userId = req.user._id;

    // Check if user is a patient
    if (req.user.role.toLowerCase() !== 'patient') {
      return res.status(403).json({ message: 'Only patient can book appointment' });
    }

    // const doctor = await Doctor.findOne({ userId: doctorId }).populate('userId', '-password');

    // Find doctor
    const doctor = await Doctor.findOne({ userId: doctorId });
 //find kreyga patient vrna create usi waqt

 let patient = await Patient.findOne({  userId: patientId });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    //check availability of doc
    const availability = doctor.availability.find(avail => avail.date === date);
    if (!availability) {
      return res.status(404).json({ message: 'No availability found for the given date' });
    }

    //check slot availability
    const slot = availability.slots.find(slot => slot.time === time);
    if (!slot || slot.status !== 'available') {
      return res.status(400).json({ message: 'Slot is either not available or already taken' });
    }

    //mark as booked
    slot.status = 'booked';
    slot.bookedBy = userId;


   
    if (!patient) {
      const userEmail = req.user.email;
      patient = new Patient({ userId, email: userEmail });
    }

    // get doc and patient names
    const user = await User.findById(userId);
    const patientName = patient.personalInformation?.fullName || user.name || user.email;

    const doctorUser = await User.findById(doctor.userId);
    const doctorName = doctor.personalDetails?.fullName || doctorUser.name || doctorUser.email;

    //create the appointmentId
    const appointmentId = uuidv4();

    //added console log
    console.log("This is appointmentId", appointmentId);

    //creates new appointment and saves in db
    const appointment = new Appointment({
      appointmentId,
      date,
      time,
      patientId: userId,
      patientName,
      doctorId: doctor.userId,
      //doctorId: doctorId,
      doctorName,
      status: 'booked',
    });

    await appointment.save();


    //update docs appointment list
    doctor.appointments.push({ appointmentId, patientId: userId, date, time });
    await doctor.save();

    // Add to patient's upcoming appointments
    patient?.appointments?.upcoming.push({
      appointmentId,
      doctorId,
      date,
      time,
      status: 'booked',
    });
    await patient.save();

    res.status(200).json({ message: 'Appointment booked successfully' });
  } catch (error) {
    console.error('Error in bookAppointment: ', error);
    res.status(500).json({ message: 'An error occurred while booking the appointment' });
  }


}

// abbadv old
// const getBookedAppointments = async (req: any, res: any) => {
//   try {
//     const userId = req.user._id;
//     const patient = await Patient.findOne({ userId }).lean();
//     if (!patient) {
//       return res.status(404).json({ message: "Patient not found." });
//     }

//     if (!patient.appointments?.upcoming || patient.appointments.upcoming.length === 0) {
//       return res.status(200).json([]);
//     }
//     const doctorIds = patient.appointments.upcoming.map((appt: any) => appt.doctorId);
//     const doctors = await Doctor.find({ _id: { $in: doctorIds } }).lean();
//     const doctorMap = doctors.reduce((acc: any, doctor: any) => {
//       acc[doctor._id.toString()] = doctor;
//       return acc;
//     }, {});
//     const bookedAppointments = patient.appointments.upcoming.map((appointment: any) => {
//       const doctor = doctorMap[appointment.doctorId.toString()];
//       if (!doctor) return null;
//       try {
//         const [startTime] = appointment.time.split("-").map((t:any) => t.trim());
//         const formattedTime = convertTo24HourFormat(startTime);
//         const appointmentDate = new Date(`${appointment.date}T${formattedTime}:00`);
//         console.log("Parsed Date:", appointmentDate);
//         const currentDate = new Date();
//         let status = appointmentDate <= currentDate ? "active" : "upcoming";

//         if (status === "active") {
//           const timeDiff = currentDate.getTime() - appointmentDate.getTime();
//           if (timeDiff > 1000 * 60 * 60) {
//             status = "history";
//           }
//         }
//         const joinIn = status === "upcoming" ? getTimeRemaining(appointmentDate) : null;
//         return {
//           id: appointment._id,
//           appointmentId:appointment.appointmentId,
//           doctorName: doctor.personalDetails?.fullName || "Unknown Doctor",
//           specialization: doctor.professionalDetails?.specialisation || "General Practitioner",
//           bookedTimeSlot: appointment.time,
//           date: appointment.date,
//           duration: "60 minutes",
//           imageUrl: doctor.personalDetails?.imageUrl || "/default-doctor.png",
//           status,
//           joinIn,
//           meetingLink: appointment.meetingLink || null,
//         };
//       } catch (error) {
//         console.error("Error parsing appointment date:", error);
//         return null;
//       }
//     }).filter(Boolean);
//     res.status(200).json(bookedAppointments);
//   } catch (error) {
//     console.error("Error fetching booked appointments:", error);
//     res.status(500).json({ message: "An error occurred while fetching appointments." });
//   }
// };

const getBookedAppointments = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const patient = await Patient.findOne({ userId }).lean();
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    if (!patient.appointments?.upcoming || patient.appointments.upcoming.length === 0) {
      return res.status(200).json([]);
    }

    // Extract doctorIds from appointments and find the corresponding doctors
    const doctorUserIds = patient.appointments.upcoming.map((appt: any) => appt.doctorId);

    // Find doctors by their userIds instead of _id
    //     const doctors = await Doctor.find({ _id: { $in: doctorIds } }).lean();
    const doctors = await Doctor.find({ userId: { $in: doctorUserIds } }).lean();

    // Create a lookup map using userId instead of _id
    const doctorMap = doctors.reduce((acc: any, doctor: any) => {
      acc[doctor.userId.toString()] = doctor;
      return acc;
    }, {});

    const bookedAppointments = patient.appointments.upcoming.map((appointment: any) => {
      // Look up using the doctorId which is the userId in the User model
      const doctor = doctorMap[appointment.doctorId.toString()];
      if (!doctor) {
        console.log(`Doctor not found for doctorId: ${appointment.doctorId}`);
        return null;
      }

      try {
        console.log("we are in try block");
        const [startTime] = appointment.time.split("-").map((t: any) => t.trim());
        const formattedTime = convertTo24HourFormat(startTime);
        const appointmentDate = new Date(`${appointment.date}T${formattedTime}:00`);
        console.log("Parsed Date:", appointmentDate);
        const currentDate = new Date();
        let status = appointmentDate <= currentDate ? "active" : "upcoming";

        if (status === "active") {
          const timeDiff = currentDate.getTime() - appointmentDate.getTime();
          if (timeDiff > 1000 * 60 * 60) {
            status = "history";
            console.log("this appointment is guzar chuki : ", appointment.appointmentId)
          }
        }
        const joinIn = status === "upcoming" ? getTimeRemaining(appointmentDate) : null;
        return {
          id: appointment._id,
          appointmentId: appointment.appointmentId,
          doctorName: doctor.personalDetails?.fullName || "Unknown Doctor",
          specialization: doctor.professionalDetails?.specialisation || "General Practitioner",
          bookedTimeSlot: appointment.time,
          date: appointment.date,
          duration: "60 minutes",
          imageUrl: doctor.clinic?.image || "/default-doctor.png",
          status,
          joinIn,
          meetingLink: appointment.meetingLink || null,
        };
      } catch (error) {
        console.error("Error parsing appointment date:", error);
        return null;
      }
    }).filter(Boolean);
    console.log("These are boookedAppointments", bookedAppointments)
    res.status(200).json(bookedAppointments);
  } catch (error) {
    console.error("Error fetching booked appointments:", error);
    res.status(500).json({ message: "An error occurred while fetching appointments." });
  }
};


export const getHistoryAppointments = async (req: any, res: any) => {
  try {
    // Get the current user's ID from the request
    const userId = req.user._id;

    // Find the patient by userId
    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Helper function to check if appointment time has passed
    const isAppointmentMissed = (appointmentDate: string, appointmentTime: string) => {
      try {
        // Parse the date (assuming format: "YYYY-MM-DD" or "DD-MM-YYYY")
        const dateParts = appointmentDate.includes('-') ? appointmentDate.split('-') : appointmentDate.split('/');
        let parsedDate;
        
        // Handle different date formats
        if (dateParts[0].length === 4) {
          // YYYY-MM-DD format
          parsedDate = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
        } else {
          // DD-MM-YYYY or MM-DD-YYYY format (adjust as needed)
          parsedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        }

        // Parse the time (assuming format: "HH:MM AM/PM" or "HH:MM")
        const timeStr = appointmentTime.toLowerCase();
        let hours, minutes;
        
        if (timeStr.includes('am') || timeStr.includes('pm')) {
          const timeParts = timeStr.replace(/[ap]m/g, '').trim().split(':');
          hours = parseInt(timeParts[0]);
          minutes = parseInt(timeParts[1] || '0');
          
          if (timeStr.includes('pm') && hours !== 12) {
            hours += 12;
          } else if (timeStr.includes('am') && hours === 12) {
            hours = 0;
          }
        } else {
          const timeParts = timeStr.split(':');
          hours = parseInt(timeParts[0]);
          minutes = parseInt(timeParts[1] || '0');
        }

        // Create the full appointment datetime
        const appointmentDateTime = new Date(parsedDate);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        // Compare with current time
        const currentDateTime = new Date();
        return appointmentDateTime < currentDateTime;
      } catch (error) {
        console.error('Error parsing appointment date/time:', error);
        return false;
      }
    };

    // Check and update missed appointments in upcoming appointments
    const upcomingAppointments = patient.appointments?.upcoming || [];
    const updatedUpcoming: any[] = [];
    const missedAppointments: any[] = [];

    for (const upcomingAppointment of upcomingAppointments) {
      if (isAppointmentMissed(upcomingAppointment.date, upcomingAppointment.time)) {
        // Mark as missed and move to previous appointments
        const missedAppointment = {
          ...upcomingAppointment.toObject(),
          status: 'missed'
        };
        missedAppointments.push(missedAppointment);

        // Update the main Appointment model
        await Appointment.findOneAndUpdate(
          { appointmentId: upcomingAppointment.appointmentId },
          { status: 'missed' }
        );
      } else {
        updatedUpcoming.push(upcomingAppointment);
      }
    }

    // Update patient's appointments if there are missed appointments
    if (missedAppointments.length > 0) {
      await Patient.findOneAndUpdate(
        { userId },
        {
          $set: {
            'appointments.upcoming': updatedUpcoming
          },
          $push: {
            'appointments.previous': { $each: missedAppointments }
          }
        }
      );
    }

    // Get the final patient document to ensure we have the latest data
    const finalPatient = await Patient.findOne({ userId });
    if (!finalPatient) {
      return res.status(404).json({ message: "Patient not found after update" });
    }

    // Create a list to store the history appointments with additional data
    const historyAppointmentsWithDetails = [];

    // Process each previous appointment if they exist
    const previousAppointments = finalPatient.appointments?.previous || [];
    for (const prevAppointment of previousAppointments) {
      try {
        // Find the appointment details in the Appointment model
        const appointmentDetails = await Appointment.findOne({
          appointmentId: prevAppointment.appointmentId
        });

        // Find the doctor details to get the image
        const doctor = await Doctor.findOne({ userId: prevAppointment.doctorId });

        if (appointmentDetails && doctor) {
          // Create a history appointment object with all required details
          const historyAppointment = {
            id: new mongoose.Types.ObjectId().toString(), // Generate a unique ID
            appointmentId: prevAppointment.appointmentId,
            doctorName: appointmentDetails.doctorName,
            specialization: doctor.clinic?.specialisation || "N/A",
            appointmentTime: prevAppointment.time,
            date: prevAppointment.date,
            rating: appointmentDetails.rating || 0,
            review: appointmentDetails.review || "",
            status: prevAppointment.status,
            isAnonymous: prevAppointment.isAnonymous,
            imageUrl: doctor.clinic?.image || "/src/assets/patient/doctor/doctor.png", // Default image if not available
          };

          historyAppointmentsWithDetails.push(historyAppointment);
        }
      } catch (err) {
        console.error(`Error processing appointment ${prevAppointment.appointmentId}:`, err);
        // Continue with the next appointment even if one fails
      }
    }

    return res.status(200).json(historyAppointmentsWithDetails);
  } catch (error: any) {
    console.error("Error fetching history appointments:", error);
    return res.status(500).json({ message: "Failed to fetch history appointments", error: error.message });
  }
};



const convertTo24HourFormat = (time: string) => {
  const match = time.match(/^(\d{1,2}):?(\d{2})?\s?(AM|PM)?$/i);
  if (!match) throw new Error(`Invalid time format: ${time}`);
  let hours = parseInt(match[1]);
  let minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3] ? match[3].toUpperCase() : "";
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const getTimeRemaining = (appointmentDate: Date) => {
  const now = new Date();
  const diff = appointmentDate.getTime() - now.getTime();
  if (diff <= 0) return "Now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} Hours ${minutes} Minutes`;
  return `${minutes} Minutes`;
};

export const addNote = async (req: Request, res: Response) => {
  try {
    const { patientId, title, content } = req.body;
    if (!patientId || !title || !content) {
      return res.status(400).json({ message: 'Patient ID, title, and content are required.' });
    }
    const newNote = await Note.create({ title, content });
    const patient = await Patient.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }
    patient.notes.push(newNote._id);
    await patient.save();
    res.status(201).json({ message: 'Note added successfully.', note: newNote });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'An error occurred while adding the note.' });
  }
};

export const editNote = async (req: Request, res: Response) => {
  try {
    const { noteId, title, content } = req.body;
    console.log("Received request body:", req.body);
    if (!noteId || (!title && !content)) {
      return res.status(400).json({ message: 'Note ID and at least one field to update are required.' });
    }
    const updatedNote = await Note.findByIdAndUpdate(
      noteId,
      { title, content },
      { new: true, runValidators: true }
    );
    if (!updatedNote) {
      return res.status(404).json({ message: 'Note not found.' });
    }
    res.status(200).json({ message: 'Note updated successfully.', note: updatedNote });
  } catch (error) {
    console.error('Error editing note:', error);
    res.status(500).json({ message: 'An error occurred while editing the note.' });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { patientId, noteId } = req.body;
    if (!patientId || !noteId) {
      return res.status(400).json({ message: 'Patient ID and Note ID are required.' });
    }
    const patient = await Patient.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }
    patient.notes = patient.notes.filter((id: any) => id.toString() !== noteId);
    await patient.save();
    const deletedNote = await Note.findByIdAndDelete(noteId);
    if (!deletedNote) {
      return res.status(404).json({ message: 'Note not found.' });
    }
    res.status(200).json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'An error occurred while deleting the note.' });
  }
};

export const getAllNotes = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }
    const patient = await Patient.findOne({ userId: patientId }).populate('notes');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }
    res.status(200).json({
      message: 'Notes retrieved successfully.',
      notes: patient.notes,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'An error occurred while retrieving notes.' });
  }
};

export const applyProgram = async (req: any, res: any) => {
  const userId = req.user._id;
  console.log("This is userId in applyProgram", userId)
  const {
    programId,
    planName,
    startDate,
    endDate,
    dailyProgress,
  } = req.body;

  try {
    const patient = await Patient.findOne({ userId });
    if (!patient) return res.status(404).send("Patient not found");

    // ensure programs object exists


    patient.programs!.applied.push({
      program: programId,
      planName,
      startDate,
      endDate,
      dailyProgress,
    });

    await patient.save();
    res.status(200).send({ message: "Program applied" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const getOngoingPrograms = async (req: any, res: any) => {
  try {
    const currentDate = new Date();

    // Find the current user and their ongoing programs
    const userId = req.user._id;

    const patient = await Patient.findOne({ userId });
    if (!patient) return res.status(404).send("Patient not found");

    // Check programs with end dates in the past and move them to previous
    const programsToMove: number[] = [];

    patient.programs!.applied.forEach((program, index) => {
      const endDate = new Date(program.endDate);
      console.log('this is currentDate :', currentDate)
      console.log(`this is endDate for index ${index} : ${endDate} `, index, endDate)
      if (endDate < currentDate) {
        console.log('end date is smaller. should be pushed into previous.')
        programsToMove.push(index); // Store indices of programs to be moved
        patient.programs!.previous.push(program);
      }
    });

    // Remove moved programs from applied array (in reverse order to avoid index issues)
    for (let i = programsToMove.length - 1; i >= 0; i--) {
      patient.programs!.applied.splice(programsToMove[i], 1);
    }

    // Save the patient document with the updated arrays
    await patient.save();

    // Filter for ongoing programs where current date falls within program dates
    const ongoingPrograms = patient.programs!.applied.filter(program => {
      const startDate = new Date(program.startDate);
      const endDate = new Date(program.endDate);
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (ongoingPrograms.length === 0) {
      return res.status(200).json({
        message: "No ongoing programs found",
        programs: []
      });
    }

    // For each ongoing program, find today's tasks
    const programsWithTodaysTasks = ongoingPrograms.map(program => {
      // Convert dates to string format for comparison (YYYY-MM-DD)
      const todayDateString = currentDate.toISOString().split('T')[0];

      // Find today's daily progress
      const todayProgress = program.dailyProgress.find(day => {
        const dayDateString = new Date(day.date).toISOString().split('T')[0];
        return dayDateString === todayDateString;
      });

      // Calculate today's completed tasks instead of all days
      const tasksCompletedToday = todayProgress
        ? todayProgress.tasks.filter(task => task.completed).length
        : 0;

      return {
        programId: program._id,
        planName: program.planName,
        startDate: program.startDate,
        endDate: program.endDate,
        todayTasks: todayProgress ? todayProgress.tasks : [],
        todayProgressId: todayProgress ? todayProgress._id : null,
        // Calculate progress
        daysCompleted: getCurrentDayNumber(program.startDate, currentDate),
        totalDays: getDaysBetweenDates(program.startDate, program.endDate),
        tasksCompleted: tasksCompletedToday,
        totalTasks: todayProgress ? todayProgress.tasks.length : 0
      };
    });

    return res.status(200).json({
      programs: programsWithTodaysTasks
    });
  } catch (error) {
    console.error("Error fetching ongoing programs:", error);
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
    return res.status(500).json({ message: "Internal server error", error: "Unknown error" });
  }
}


export const getPreviousPrograms = async (req: any, res: any) => {
  try {
    // Get the current user ID from the authenticated request
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated"
      });
    }

    // Find the patient with the given userId
    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found"
      });
    }

    // Check if there are any previous programs
    if (!patient.programs || !patient.programs.previous || patient.programs.previous.length === 0) {
      return res.status(200).json({
        message: "No previous programs found",
        programs: []
      });
    }

    // Map the previous programs to a more readable format
    const formattedPreviousPrograms = patient.programs.previous.map(program => {
      // Calculate overall task completion statistics
      let totalTasks = 0;
      let completedTasks = 0;

      program.dailyProgress.forEach(day => {
        totalTasks += day.tasks.length;
        completedTasks += day.tasks.filter(task => task.completed).length;
      });

      // Calculate completion percentage
      const completionPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      return {
        programId: program._id,
        planName: program.planName,
        startDate: program.startDate,
        endDate: program.endDate,
        statistics: {
          totalDays: program.dailyProgress.length,
          totalTasks,
          completedTasks,
          completionPercentage
        },
        dailyProgress: program.dailyProgress
        // You can add more fields here if needed
      };
    });

    // Sort programs by end date (most recent first)
    formattedPreviousPrograms.sort((a, b) =>
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    );

    return res.status(200).json({
      message: "Previous programs retrieved successfully",
      count: formattedPreviousPrograms.length,
      programs: formattedPreviousPrograms
    });
  } catch (error) {
    console.error("Error fetching previous programs:", error);
    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
    return res.status(500).json({
      message: "Internal server error",
      error: "Unknown error"
    });
  }
};

export const markTaskComplete = async (req: any, res: any) => {
  try {
    const { programId, dailyProgressId, taskIndex } = req.body;

    if (!programId || !dailyProgressId || taskIndex === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userId = req.user._id;

    const patient = await Patient.findOne({ userId });
    if (!patient) return res.status(404).send("Patient not found");

    // Find the specific program
    const programIndex = patient.programs!.applied.findIndex(p =>
      p._id.toString() === programId
    );

    if (programIndex === -1) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Find the specific daily progress
    const dailyProgressIndex = patient.programs!.applied[programIndex].dailyProgress.findIndex(d =>
      d._id.toString() === dailyProgressId
    );

    if (dailyProgressIndex === -1) {
      return res.status(404).json({ message: "Daily progress not found" });
    }

    // Find the specific task and toggle its completion status
    if (taskIndex >= 0 && taskIndex < patient.programs!.applied[programIndex].dailyProgress[dailyProgressIndex].tasks.length) {
      // Toggle the completed status
      const currentStatus = patient.programs!.applied[programIndex].dailyProgress[dailyProgressIndex].tasks[taskIndex].completed;
      patient.programs!.applied[programIndex].dailyProgress[dailyProgressIndex].tasks[taskIndex].completed = !currentStatus;

      await patient.save();

      return res.status(200).json({
        message: `Task ${currentStatus ? 'unmarked' : 'marked'} as complete`,
        completed: !currentStatus
      });
    } else {
      return res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    console.error("Error marking task as complete:", error);

    if (error instanceof Error) {
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });

    }
    return res.status(500).json({ message: "Internal server error", error: "Unkown error" });
  }
};

// Helper function to calculate the current day number in the program
function getCurrentDayNumber(startDate: string | Date, currentDate: string | Date): number {
  const start = new Date(startDate);
  const current = new Date(currentDate);

  // Reset time part to only compare dates
  start.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays + 1;
}

// Helper function to calculate total days between two dates
function getDaysBetweenDates(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}


// const submitPatientPersonalDetails = async (req: any, res: any) => {
//   try {
//       const { fullName, age, gender, disability, country, city, phoneNo, image } = req.body;
//       const userId = req.user._id;

//       if (req.user.role.toLowerCase() !== 'patient') {
//           return res.status(403).json({ message: 'Only patients can submit personal details' });
//       }

//       let patient = await Patient.findOne({ userId });
//       if (!patient) {
//           const userEmail = req.user.email;
//           patient = new Patient({ userId, email: userEmail });
//       }

//       patient.personalInformation = { fullName, age, gender, disability, country, city, phoneNo, image };
//       await patient.save();

//       res.status(200).json({ message: 'Personal details submitted successfully' });
//   } catch (error) {
//       console.error('Error in submitPersonalDetails:', error);
//       res.status(500).json({ message: 'An error occurred while submitting personal details' });
//   }
// };


const submitPatientPersonalDetails = async (req: any, res: any) => {
  try {
    const { fullName, age, gender, disability, country, city, phoneNo, image } = req.body;
    const userId = req.user._id;

    if (req.user.role.toLowerCase() !== 'patient') {
      return res.status(403).json({ message: 'Only patients can submit personal details' });
    }

    // Create or update Patient record
    let patient = await Patient.findOne({ userId });
    if (!patient) {
      const userEmail = req.user.email;
      patient = new Patient({ userId, email: userEmail });
    }

    let imageUrl = "";
    if (image) {
      const uploadedResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadedResponse.secure_url;
    }

    patient.personalInformation = { fullName, age, gender, disability, country, city, phoneNo, image: imageUrl };
    await patient.save();

    // Update profileCompleted status on User model
    await User.findByIdAndUpdate(userId, { profileCompleted: true, profilePicture: image });

    // Return user data with updated profileCompleted status
    const updatedUser = await User.findById(userId).select('-password');

    res.status(200).json({
      message: 'Personal details submitted successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error in submitPersonalDetails:', error);
    res.status(500).json({ message: 'An error occurred while submitting personal details' });
  }
};


const updatePatientPersonalDetails = async (req: any, res: any) => {
  try {
    const { fullName, age, gender, disability, country, city, phoneNo, image } = req.body;
    const userId = req.user._id;

    if (req.user.role.toLowerCase() !== 'patient') {
      return res.status(403).json({ message: 'Only patients can update personal details' });
    }

    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found. Please complete registration first.' });
    }


    patient.personalInformation = {
      ...patient.personalInformation, // Preserve existing fields not being updated
      fullName,
      age,
      gender,
      disability,
      country,
      city,
      phoneNo,
      image,
    };

    await patient.save();


    // Update profileCompleted status on User model
    await User.findByIdAndUpdate(userId, { profileCompleted: true, profilePicture: image });

    // Return user data with updated profileCompleted status
    const updatedUser = await User.findById(userId).select('-password');

    res.status(200).json({
      message: 'Personal details updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error in updatePatientPersonalDetails:', error);
    res.status(500).json({ message: 'An error occurred while updating personal details' });
  }
};

const getPatientDetails = async (req: any, res: any) => {
  try {
    const userId = req.user._id;

    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const personalInformation = patient.personalInformation;

    if (!personalInformation) {
      return res.status(200).json({ message: "No personal details found yet", personalInformation: null });
    }

    res.status(200).json({
      message: "Patient personal details fetched successfully",
      personalInformation,
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({ message: "An error occurred while fetching patient details" });
  }
};

export const getPatientPrescriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
      return;
    }

    // Find all prescriptions for the patient
    const prescriptions = await Prescription.find({ patientId }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient prescriptions',
      error: error instanceof Error ? error.message : 'Unknown error'

    })
  }
}

export const getPrescriptionById = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    console.log("this is appointmentId in PrescriptionController: ", appointmentId)
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    // Find prescription where prescriptionId matches the appointmentId
    const prescription = await Prescription.findOne({ prescriptionId: appointmentId });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'No prescription found for this appointment'
      });
    }

    return res.status(200).json({
      success: true,
      data: prescription
    });
  } catch (error: any) {
    console.error('Error fetching prescription:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching prescription',
      error: error.message
    });
  }
};

const moodLogging = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { mood } = req.body;

    // Validate request body
    if (!userId || !mood) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and mood'
      });
    }

    // Find the patient by userId
    // const Patient = mongoose.model('Patient');
    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if the patient has logged a mood today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of the day

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Set to beginning of the next day

    // Check if a mood has been logged in the last 24 hours
    const recentMoodEntry = patient.dailyMood.find((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= today && entryDate < tomorrow;
    });

    if (recentMoodEntry) {
      return res.status(400).json({
        success: false,
        message: 'Mood has already been logged today. You can log again after 24 hours.'
      });
    }

    // Add new mood entry
    patient.dailyMood.push({
      date: new Date(),
      mood
    });

    // Save updated patient record
    await patient.save();

    return res.status(200).json({
      success: true,
      message: 'Mood logged successfully',
      data: {
        date: new Date(),
        mood
      }
    });
  } catch (error) {
    console.error('Error in mood logging:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as any).message
    });
  }
};

// Get today's mood for the logged-in user
const getTodayMood = async (req: any, res: any) => {
  try {
    const userId = req.user._id;

    // Find the patient by userId
    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get today's date (beginning of the day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find mood entry for today
    const todayMood = patient.dailyMood.find((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= today && entryDate < tomorrow;
    });

    if (!todayMood) {
      return res.status(200).json({
        success: true,
        message: 'No mood has been logged today',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Today\'s mood retrieved successfully',
      data: todayMood
    });
  } catch (error) {
    console.error('Error getting today\'s mood:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as any).message
    });
  }
};


// Get moods for the last 15 days
const getMoodsForLast15Days = async (req: any, res: any) => {
  try {
    const userId = req.user._id;

    // Find the patient by userId
    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Calculate date range for the last 15 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // 15 days ago (including today)
    startDate.setHours(0, 0, 0, 0); // Beginning of that day

    // Filter mood entries for the last 15 days and sort by date
    const moodEntries = patient.dailyMood
      .filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generate all dates in the range in descending order
    const dateRange = [];
    const currentDate = new Date(endDate);

    while (currentDate >= startDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Map the mood entries to the date range
    const moodHistory = dateRange.map(date => {
      const dateString = date.toISOString().split('T')[0];

      const matchingEntry = moodEntries.find(entry =>
        new Date(entry.date).toISOString().split('T')[0] === dateString
      );

      return {
        date: dateString,
        mood: matchingEntry ? matchingEntry.mood : null

      };
    });

    return res.status(200).json({
      success: true,
      message: 'Mood history for the last 15 days retrieved successfully',
      data: {
        moodHistory,
        summary: {
          totalDays: 15,
          daysWithMoodLogged: moodEntries.length
        }
      },
      patientName: patient.personalInformation?.fullName || 'Ahsan shahzad', // Replace with actual patient name field
      patientGender: patient.personalInformation?.gender || 'Male', // Replace with actual patient sex field
      patientAge: patient.personalInformation?.age || 20,
    });
  } catch (error) {
    console.error('Error getting mood history:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as any).message
    });
  }
};

export const saveReview = async (req: any, res: any) => {
  try {
    const { appointmentId, rating, review, privateReview } = req.body;
    const userId = req.user._id;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // Find the appointment
    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Update the appointment with rating and review
    appointment.rating = rating;
    appointment.review = review;

    // Update appointment status to completed if not already
    if (appointment.status !== 'completed') {
      appointment.status = 'completed';
    }

    await appointment.save();

    // Find the doctor regardless of whether there's a private review
    const doctor = await Doctor.findOne({ userId: appointment.doctorId });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Update TotalStars and TotalReviews in doctor's rating
    if (!doctor.rating) {
      doctor.rating = { TotalStars: 0, TotalReviews: 0 };
    }

    // Safely access and update the rating fields
    doctor.rating.TotalStars = (doctor.rating.TotalStars || 0) + rating; // Add the rating value to TotalStars
    doctor.rating.TotalReviews = (doctor.rating.TotalReviews || 0) + 1; // Increment TotalReviews by 1

    // Remove the appointment from doctor's appointments array
    if (doctor.appointments && doctor.appointments.length > 0) {
      const appointmentIndex = doctor.appointments.findIndex(
        appt => appt.appointmentId === appointmentId
      );

      if (appointmentIndex >= 0) {
        doctor.appointments.splice(appointmentIndex, 1);
      }
    }

    // Add private review to doctor if provided
    if (privateReview && privateReview.trim() !== '') {
      doctor.privateReviews = doctor.privateReviews || [];
      doctor.privateReviews.push({
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        privateReview
      });
    }

    await doctor.save();

    // Find the patient and update appointment records
    const patient = await Patient.findOne({ userId });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Initialize arrays if they don't exist
    // patient.appointments = patient.appointments || { upcoming: [], previous: [] };

    // Find the appointment in the upcoming array
    const upcomingIndex = patient.appointments?.upcoming?.findIndex(
      upcomingAppt => upcomingAppt.appointmentId === appointmentId
    );

    // If found in upcoming array
    if (upcomingIndex !== undefined && upcomingIndex >= 0 && patient.appointments?.upcoming) {
      const upcomingAppointment = patient.appointments?.upcoming[upcomingIndex];

      // Create entry for previous appointments with rating and review
      const previousAppointment = {
        appointmentId: upcomingAppointment.appointmentId,
        doctorId: upcomingAppointment.doctorId,
        date: upcomingAppointment.date,
        time: upcomingAppointment.time,
        status: 'completed',
        feedback: review || '',
        rating: rating || 0
      };

      // Add to previous appointments array
      patient.appointments.previous = patient.appointments?.previous || [];
      patient.appointments.previous.push(previousAppointment);

      // Remove from upcoming appointments array
      patient.appointments?.upcoming.splice(upcomingIndex, 1);

      // Save patient changes
      await patient.save();
    } else {
      console.log(`Appointment ${appointmentId} not found in patient's upcoming appointments`);
    }

    console.log("Review saved and appointment moved to history successfully");
    return res.status(200).json({ message: 'Review saved successfully' });
  } catch (error: any) {
    console.error('Error saving review:', error);
    return res.status(500).json({ message: 'Failed to save review', error: error.message });
  }
};
// Create and save a new mood progress report
const createMoodProgressReport = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const {
      //patientId, 
      medicines,
      moodData,
      summary,
      daysGoingWell,
      daysGoingBad,
      daysWithNoMood,
      moodAvgPercentage
    } = req.body;

    // Find the patient to get their details
    // const patient = await Patient.findById(patientId);

    const patient = await Patient.findOne({ userId: userId });


    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get user info for verification
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine progress status based on mood average percentage
    let progressStatus;
    if (moodAvgPercentage >= 70) {
      progressStatus = 'Good Progress';
    } else if (moodAvgPercentage >= 40) {
      progressStatus = 'Average Progress';
    } else {
      progressStatus = 'Needs Improvement';
    }

    // Create a new mood progress report
    const newReport = new MoodProgressReport({
      userId,
      //patientId,
      patientName: patient.personalInformation?.fullName || 'Ahsan shahzad', // Replace with actual patient name field
      patientSex: patient.personalInformation?.gender || 'Male', // Replace with actual patient sex field
      patientAge: patient.personalInformation?.age || 20, // Replace with actual patient age field
      daysWithMoodLogged: summary.daysWithMoodLogged,
      totalDays: summary.totalDays,
      prescribedMedicines: medicines || 'None',
      moodAvgPercentage,
      progressStatus,
      moodData,
      daysGoingWell,
      daysGoingBad,
      daysWithNoMood
    });

    // Save the report to the database
    const savedReport = await newReport.save();

    return res.status(201).json({
      patientName: patient.personalInformation?.fullName || 'Ahsan shahzad', // Replace with actual patient name field
      patientGender: patient.personalInformation?.gender || 'Male', // Replace with actual patient sex field
      patientAge: patient.personalInformation?.age || 20, // Replace with actual patient age field
      daysWithMoodLogged: summary.daysWithMoodLogged,
      success: true,
      message: 'Mood progress report created successfully',
      data: {
        reportId: savedReport._id,
        generatedAt: savedReport.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error creating mood progress report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all reports for a specific patient
const getPatientReports = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const patient = await Patient.findOne({ userId: userId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    const reports = await MoodProgressReport.find({ userId })
      .sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      success: true,
      message: 'Patient reports retrieved successfully',
      data: reports,
      patientName: patient.personalInformation?.fullName || 'Ahsan shahzad', // Replace with actual patient name field
      patientGender: patient.personalInformation?.gender || 'Male', // Replace with actual patient sex field
      patientAge: patient.personalInformation?.age || 20, // Replace with actual patient age field
    });
  } catch (error: any) {
    console.error('Error retrieving patient reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get a specific report by ID
const getReportById = async (req: any, res: any) => {
  try {
    const { reportId } = req.params;

    const report = await MoodProgressReport.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Report retrieved successfully',
      data: report
    });
  } catch (error: any) {
    console.error('Error retrieving report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



// Controller to handle appointment rescheduling
const rescheduleAppointment = async (req: any, res: any) => {
  try {
    const { appointmentId, patientId, date, time } = req.body;

    // Validate required fields
    if (!appointmentId || !patientId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: appointmentId, patientId, or patient"
      });
    }

    // Find the appointment to get doctorId and patient email
    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    const doctorId = appointment.doctorId;

    // Get patient email from database
    const patientDoc = await Patient.findOne({ userId: patientId });
    if (!patientDoc || !patientDoc.email) {
      return res.status(404).json({
        success: false,
        message: "Patient email not found"
      });
    }

    const patientEmail = patientDoc.email;

    // Delete the appointment from the main Appointment collection
    await Appointment.findOneAndDelete({ appointmentId });

    // Remove appointment from patient's upcoming appointments
    await Patient.updateOne(
      { userId: patientId },
      {
        $pull: {
          "appointments.upcoming": { appointmentId }
        }
      }
    );

    // Remove appointment from doctor's appointments array
    await Doctor.updateOne(
      { userId: doctorId },
      {
        $pull: {
          appointments: { appointmentId }
        }
      }
    );

    
    // Create the rebooking link
    const rebookingLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/doctor-details-rebooking?appointmentId=${appointmentId}&patientId=${patientId}&doctorId=${doctorId}`;

    // Email options
    const emailOptions = {
      email: patientEmail,
      subject: "Appointment Cancelled - Please Reschedule",
      message: `
Dear ${patientId},

Your appointment scheduled for ${date} at ${time} has been cancelled and needs to be rescheduled.

To book a new appointment slot, please click on the link below:
${rebookingLink}

This will take you directly to our booking system where you can select a new date and time that works best for you.

We apologize for any inconvenience caused and appreciate your understanding.

Best regards,
PsyLink Team
            `
    };

    // Send the email
    await sendEmail(emailOptions);

    res.status(200).json({
      success: true,
      message: "Appointment cancelled, database updated, and rescheduling email sent successfully",
      data: {
        appointmentId,
        patientEmail,
        doctorId,
        rebookingLink
      }
    });

  } catch (error) {
    console.error("Error in reschedule appointment:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel appointment and send rescheduling email",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};



export {
  test, getVerifiedDoctors, bookAppointment, getBookedAppointments, submitPatientPersonalDetails, getPatientDetails, updatePatientPersonalDetails, moodLogging, getTodayMood, getMoodsForLast15Days,
  createMoodProgressReport,
  getPatientReports,
  getReportById, rescheduleAppointment
}
