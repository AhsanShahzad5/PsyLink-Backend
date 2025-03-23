import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import User from '../models/UserModel';
import bcryptjs from 'bcryptjs'
import Doctor from '../models/DoctorModel';
import Patient from '../models/PatientModel';
import Note from '../models/NotesModel';

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
              slots: day.slots.filter(slot => slot.status === 'available') // Sirf "available" slots show hongi
          })).filter(day => day.slots.length > 0)
      }));

      res.status(200).json(filteredDoctors);
  } catch (error) {
      res.status(500).json("ERROR");
  }
};


const bookAppointment = async (req:any, res:any) => {
    try {
        const { doctorId, date, time } = req.body; // Doctor ID, date, and time from patient request
        const userId = req.user._id;

        if (req.user.role.toLowerCase() !== 'patient') {
            return res.status(403).json({ message: 'Only patient can book appointment' });
        }


        const doctor = await Doctor.findOne({_id: doctorId});
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const availability = doctor.availability.find(avail => avail.date === date);
        if (!availability) {
            return res.status(404).json({ message: 'No availability found for the given date' });
        }

        const slot = availability.slots.find(slot => slot.time === time);
        if (!slot || slot.status !== 'available') {
            return res.status(400).json({ message: 'Slot is either not available or already taken' });
        }

        slot.status = 'booked';
        slot.bookedBy = userId;

        // Optional: Add to appointments list
        doctor.appointments.push({ patientId: userId, date, time });
        await doctor.save();


        let patient = await Patient.findOne({ userId });
        if (!patient) {
            const userEmail = req.user.email; 
           patient = new Patient({ userId, email: userEmail });
        }

        // Add to patient's upcoming appointments
        patient?.appointments?.upcoming.push({
            doctorId,
            date,
            time,
            status: 'booked',
        });
        await patient.save();

        res.status(200).json({ message: 'Appointment booked successfully' });
    } catch (error) {
        console.error('Error in bookAppointment:', error);
        res.status(500).json({ message: 'An error occurred while booking the appointment' });
    }
};

//NOTES CONTROLLERS
export const addNote = async (req: Request, res: Response) => {
  try {
    const { patientId, title, content } = req.body;
    
    if (!patientId || !title || !content) {
      return res.status(400).json({ message: 'Patient ID, title, and content are required.' });
    }

    // Create a new note
    const newNote = await Note.create({ title, content });

    // Find the patient and add the note reference
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

// **Edit an Existing Note**
export const editNote = async (req: Request, res: Response) => {
  try {
    const { noteId, title, content } = req.body;
    console.log("Received request body:", req.body);
    if (!noteId || (!title && !content)) {
      return res.status(400).json({ message: 'Note ID and at least one field to update are required.' });
    }

    // Find the note by ID and update it
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

// **Delete a Note**
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { patientId, noteId } = req.body;

    if (!patientId || !noteId) {
      return res.status(400).json({ message: 'Patient ID and Note ID are required.' });
    }

    // Find the patient and remove the note reference
    const patient = await Patient.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    patient.notes = patient.notes.filter((id: any) => id.toString() !== noteId);
    await patient.save();

    // Remove the note from the Note collection
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

//get all notes
export const getAllNotes = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    // Find the patient
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

// const updateAppointmentsStatus = async (req: any, res: any) => {
//     try {
//         const userId = req.user._id;

//         if (req.user.role.toLowerCase() !== 'patient') {
//             return res.status(403).json({ message: 'Only patient can book appointment' });
//         }
//         let patient = await Patient.findOne({ userId });
//         if (!patient) {
//             return res.status(404).json({ message: 'Patient not found to update their status' });
//         }
//         const currentDate = new Date();

        
//             const upcoming = patient?.appointments?.upcoming;
//             const pastAppointments = upcoming.filter( (appointment:any) => {
//                 const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
//                 return appointmentDate <= currentDate;
//             });

//             // Move past appointments to `previous`
//             patient?.appointments?.previous.push(
//                 ...pastAppointments.map((appt:any) => ({
//                     ...appt,
//                     status: 'completed',
//                 }))
//             );

//             // Keep only future appointments in `upcoming`
//             patient?.appointments?.upcoming = upcoming.filter(appointment => {
//                 const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
//                 return appointmentDate > currentDate;
//             });

//             await patient.save();
        

//         res.status(200).json({ message: 'Appointments updated successfully' });
//     } catch (error) {
//         console.error('Error updating appointments:', error);
//         res.status(500).json({ message: 'An error occurred while updating appointments' });
//     }
// };




export {test, getVerifiedDoctors, bookAppointment}