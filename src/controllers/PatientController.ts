import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import User from '../models/UserModel';
import bcryptjs from 'bcryptjs'
import Doctor from '../models/DoctorModel';
import Patient from '../models/PatientModel';
import Note from '../models/NotesModel';
import { v4 as uuidv4 } from 'uuid';

const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to patient' });
}

const getVerifiedDoctors = async (req: any, res: any) => {
  try {
      const verifiedDoctors = await Doctor.find({ status: 'verified' })
          .select('clinic availability')
          .lean();
      const filteredDoctors = verifiedDoctors.map(doctor => ({
          ...doctor,
          availability: doctor.availability.map(day => ({
              ...day,
              slots: day.slots.filter(slot => slot.status === 'available')
          })).filter(day => day.slots.length > 0)
      }));
      res.status(200).json(filteredDoctors);
  } catch (error) {
      res.status(500).json("ERROR");
  }
};

// const bookAppointment = async (req:any, res:any) => {
//     try {
//         const { doctorId, date, time } = req.body;
//         const userId = req.user._id;
//         if (req.user.role.toLowerCase() !== 'patient') {
//             return res.status(403).json({ message: 'Only patient can book appointment' });
//         }
//         const doctor = await Doctor.findOne({_id: doctorId});
//         if (!doctor) {
//             return res.status(404).json({ message: 'Doctor not found' });
//         }
//         const availability = doctor.availability.find(avail => avail.date === date);
//         if (!availability) {
//             return res.status(404).json({ message: 'No availability found for the given date' });
//         }
//         const slot = availability.slots.find(slot => slot.time === time);
//         if (!slot || slot.status !== 'available') {
//             return res.status(400).json({ message: 'Slot is either not available or already taken' });
//         }
//         slot.status = 'booked';
//         slot.bookedBy = userId;

//         let patient = await Patient.findOne({ userId });
//         if (!patient) {
//             const userEmail = req.user.email; 
//            patient = new Patient({ userId, email: userEmail });
//         }

//         //create the appointmentId
//         const appointmentId = uuidv4();

//         //added console log
//         console.log("This is appointmentId", appointmentId);
//          // Optional: Add to appointments list
//          doctor.appointments.push({ appointmentId ,patientId: userId, date, time });
//          await doctor.save();

//         // Add to patient's upcoming appointments
//         patient?.appointments?.upcoming.push({
//             appointmentId,
//             doctorId,
//             date,
//             time,
//             status: 'booked',
//         });
//         await patient.save();

//         res.status(200).json({ message: 'Appointment booked successfully' });
//     } catch (error) {
//         console.error('Error in bookAppointment:', error);
//         res.status(500).json({ message: 'An error occurred while booking the appointment' });
//     }
// };


const bookAppointment = async (req:any, res:any) => {
  try {
    const { doctorId, date, time } = req.body;
    const userId = req.user._id;
    
    if (req.user.role.toLowerCase() !== 'patient') {
      return res.status(403).json({ message: 'Only patient can book appointment' });
    }
    
    const doctor = await Doctor.findOne({_id: doctorId});
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Other validation logic...
    
    // Generate appointment ID
    const appointmentId = uuidv4();
    //console.log("This is appointmentId", appointmentId);
    
    // Check and fix existing appointments that may be missing appointmentId
    doctor.appointments.forEach((appointment, index) => {
      if (!appointment.appointmentId) {
        doctor.appointments[index].appointmentId = uuidv4();
      }
    });
    
    // Add the new appointment
    doctor.appointments.push({ 
      appointmentId, 
      patientId: userId, 
      date, 
      time 
    });
    
    // Save doctor after fixing appointments
    await doctor.save();
    
    // Rest of your code for patient, etc.
    
    res.status(200).json({ message: 'Appointment booked successfully' });
  } catch (error) {
    console.error('Error in bookAppointment:', error);
    res.status(500).json({ message: 'An error occurred while booking the appointment' });
  }
};
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
    const doctorIds = patient.appointments.upcoming.map((appt: any) => appt.doctorId);
    const doctors = await Doctor.find({ _id: { $in: doctorIds } }).lean();
    const doctorMap = doctors.reduce((acc: any, doctor: any) => {
      acc[doctor._id.toString()] = doctor;
      return acc;
    }, {});
    const bookedAppointments = patient.appointments.upcoming.map((appointment: any) => {
      const doctor = doctorMap[appointment.doctorId.toString()];
      if (!doctor) return null;
      try {
        const [startTime] = appointment.time.split("-").map((t:any) => t.trim());
        const formattedTime = convertTo24HourFormat(startTime);
        const appointmentDate = new Date(`${appointment.date}T${formattedTime}:00`);
        console.log("Parsed Date:", appointmentDate);
        const currentDate = new Date();
        let status = appointmentDate <= currentDate ? "active" : "upcoming";

        if (status === "active") {
          const timeDiff = currentDate.getTime() - appointmentDate.getTime();
          if (timeDiff > 1000 * 60 * 60) {
            status = "history";
          }
        }
        const joinIn = status === "upcoming" ? getTimeRemaining(appointmentDate) : null;
        return {
          id: appointment._id,
          appointmentId:appointment.appointmentId,
          doctorName: doctor.personalDetails?.fullName || "Unknown Doctor",
          specialization: doctor.professionalDetails?.specialisation || "General Practitioner",
          bookedTimeSlot: appointment.time,
          date: appointment.date,
          duration: "60 minutes",
          imageUrl: doctor.personalDetails?.imageUrl || "/default-doctor.png",
          status,
          joinIn,
          meetingLink: appointment.meetingLink || null,
        };
      } catch (error) {
        console.error("Error parsing appointment date:", error);
        return null;
      }
    }).filter(Boolean);
    res.status(200).json(bookedAppointments);
  } catch (error) {
    console.error("Error fetching booked appointments:", error);
    res.status(500).json({ message: "An error occurred while fetching appointments." });
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

export const applyProgram =async (req: any, res: any) => {
  const userId = req.user._id;
  console.log("This is userId in applyProgram",userId)
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

export {test, getVerifiedDoctors, bookAppointment, getBookedAppointments}
