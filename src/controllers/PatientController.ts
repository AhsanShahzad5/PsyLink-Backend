import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import User from '../models/UserModel';
import bcryptjs from 'bcryptjs'
import Doctor from '../models/DoctorModel';
import Patient from '../models/PatientModel';


const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to patient' });
}

const getVerifiedDoctors = async (req: any, res: any) => {
    const verifiedDoctors = await Doctor.find({ status: 'verified' }).select('clinic').select('availability');
    res.status(200).json(verifiedDoctors);
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
           patient = new Patient({ userId });
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