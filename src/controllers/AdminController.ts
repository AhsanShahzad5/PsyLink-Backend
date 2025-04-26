

import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import Admin from '../models/AdminModel';
import Doctor from '../models/DoctorModel';
import Patient from '../models/PatientModel';
import User from '../models/UserModel';
import Appointment from '../models/AppointmentModel';

const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to doctor' });
}

// no signup for admin , admin will be created directly in database

const loginAdmin = async (req: Request, res: Response) => {
    try {
        const { username, password , role} = req.body;
        const user = await Admin.findOne({ username });
       
        if (!user || user.password !== password) {
            return res.status(400).json({ error: "Invalid username or password" });
        }

        generateTokenAndSetCookie(user._id, res);

        //show who the user is after logging in
        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: role,
        });
        console.log("backend + " , role);
        
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
        console.log(`Error in logging in user: ${(error as Error).message}`);
    }
};

// Doctor Management
const getPendingDoctors = async (req: any, res: any) => {
    try {
        const pendingDoctors = await Doctor.find({ status: 'pending' }).select('-password');
        res.status(200).json(pendingDoctors);
    } catch (error) {
        console.error('Error fetching pending doctors:', error);
        res.status(500).json({ message: 'An error occurred while fetching pending doctors' });
    }
};

const verifyDoctor = async (req: any, res: any) => {
    try {
        const doctorId = req.params.id;
        
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        
        doctor.status = 'verified';
        await doctor.save();
        
        res.status(200).json({ message: 'Doctor verified successfully' });
    } catch (error) {
        console.error('Error verifying doctor:', error);
        res.status(500).json({ message: 'An error occurred while verifying the doctor' });
    }
};


//new controllers
const getVerifiedDoctors = async (req: any, res: any) => {
    try {
        const verifiedDoctors = await Doctor.find({ status: 'verified' }).select('-password');
        res.status(200).json(verifiedDoctors);
    } catch (error) {
        console.error('Error fetching verified doctors:', error);
        res.status(500).json({ message: 'An error occurred while fetching verified doctors' });
    }
};

const rejectDoctor = async (req: any, res: any) => {
    try {
        const doctorId = req.params.id;
        const { reason } = req.body;
        
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        
        // Optionally, you could send an email notification to the doctor with the rejection reason
        
        // Delete the doctor document
        await Doctor.findByIdAndDelete(doctorId);
        
        // Optionally, you might want to delete or mark the corresponding user account
        
        res.status(200).json({ message: 'Doctor application rejected successfully' });
    } catch (error) {
        console.error('Error rejecting doctor:', error);
        res.status(500).json({ message: 'An error occurred while rejecting the doctor' });
    }
};

const getDoctorDetails = async (req: any, res: any) => {
    try {
        const doctorId = req.params.id;
        
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        
        res.status(200).json(doctor);
    } catch (error) {
        console.error('Error fetching doctor details:', error);
        res.status(500).json({ message: 'An error occurred while fetching doctor details' });
    }
};

// get all doctors
const getAllDoctors = async (req: any, res: any) => {
    try {
        const doctors = await Doctor.find().select('-password');
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'An error occurred while fetching doctors' });
    }
};

// Patient Management


// const getAllPatientsAllDetails = async (req: any, res: any) => {
//     try {
//         const patients = await Patient.find().select('-password');
//         res.status(200).json(patients);
//     } catch (error) {
//         console.error('Error fetching patients:', error);
//         res.status(500).json({ message: 'An error occurred while fetching patients' });
//     }
// };

const getAllPatients = async (req: any, res: any) => {
    try {
      const patients = await Patient.find()
        .select('userId email createdAt personalInformation').sort({ createdAt: -1 });
  
      res.status(200).json(patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ message: 'An error occurred while fetching patients' });
    }
  };
  

const getPatientDetails = async (req: any, res: any) => {
    try {
        const patientId = req.params.id;
        
        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        
        res.status(200).json(patient);
    } catch (error) {
        console.error('Error fetching patient details:', error);
        res.status(500).json({ message: 'An error occurred while fetching patient details' });
    }
};

// Appointment Management
const getAllAppointments = async (req: any, res: any) => {
    try {
        // Get all doctors with their appointments
        const doctors = await Doctor.find().select('appointments personalDetails.fullName');
        
        // Extract and format all appointments
        const allAppointments = [];
        
        for (const doctor of doctors) {
            if (doctor.appointments && doctor.appointments.length > 0) {
                const doctorAppointments = doctor.appointments.map((appt: any) => ({
                    appointmentId: appt.appointmentId,
                    doctorId: doctor._id,
                    doctorName: doctor.personalDetails?.fullName || 'Unknown Doctor',
                    patientId: appt.patientId,
                    date: appt.date,
                    time: appt.time,
                    paymentStatus: appt.PaymentStatus || 'pending'
                }));
                
                allAppointments.push(...doctorAppointments);
            }
        }
        
        res.status(200).json(allAppointments);
    } catch (error) {
        console.error('Error fetching all appointments:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointments' });
    }
};

const getAppointmentDetails = async (req: any, res: any) => {
    try {
        const appointmentId = req.params.id;
        
        // Find the doctor that has this appointment
        const doctor = await Doctor.findOne({ 'appointments.appointmentId': appointmentId });
        if (!doctor) return res.status(404).json({ message: 'Appointment not found' });
        
        // Find the specific appointment
        const appointment = doctor.appointments.find((a: any) => a.appointmentId === appointmentId);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
        
        // Get patient details
        const patient = await Patient.findOne({ userId: appointment.patientId });
        
        const appointmentDetails = {
            appointmentId: appointment.appointmentId,
            doctorId: doctor._id,
            doctorName: doctor.personalDetails?.fullName || 'Unknown Doctor',
            patientId: appointment.patientId,
            patientName: patient?.personalInformation?.fullName || 'Unknown Patient',
            date: appointment.date,
            time: appointment.time,
            paymentStatus: appointment.PaymentStatus || 'pending'
        };
        
        res.status(200).json(appointmentDetails);
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointment details' });
    }
};



const deletePatient = async (req: any, res: any) => {
    try {
        const patientId = req.params.id;
        
        // Find the patient first to get the userId
        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        
        // Delete the patient document
        await Patient.findByIdAndDelete(patientId);
        
        // Delete the corresponding user account
        await User.findByIdAndDelete(patient.userId);
        
        res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ message: 'An error occurred while deleting the patient' });
    }
};

const deleteDoctor = async (req: any, res: any) => {
    try {
        const doctorId = req.params.id;
        
        // Find the doctor first to get the userId
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        
        // Delete the doctor document
        await Doctor.findByIdAndDelete(doctorId);
        
        // Delete the corresponding user account
        await User.findByIdAndDelete(doctor.userId);
        
        res.status(200).json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ message: 'An error occurred while deleting the doctor' });
    }
};

const getAllSessions = async (req: any, res: any) => {
    try {
      console.log("Fetching all appointments as sessions");
      
      const appointments = await Appointment.find()
        .populate('patientId', 'name email')
        .populate('doctorId', 'name email')
        .sort({ date: 1, time: 1 });
      
      console.log(`Found ${appointments.length} appointments`);
  
      return res.status(200).json({
        success: true,
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
// Dashboard statistics
// const getDashboardStats = async (req: any, res: any) => {
//     try {
//         // Count total users by role
//         const totalDoctors = await Doctor.countDocuments();
//         const verifiedDoctors = await Doctor.countDocuments({ status: 'verified' });
//         const pendingDoctors = await Doctor.countDocuments({ status: 'pending' });
//         const totalPatients = await Patient.countDocuments();
        
//         // Count total appointments
//         const doctors = await Doctor.find();
//         let totalAppointments = 0;
        
//         doctors.forEach(doctor => {
//             if (doctor.appointments) {
//                 totalAppointments += doctor.appointments.length;
//             }
//         });
        
//         // Get recent appointments (last 5)
//         const recentAppointments = [];
//         for (const doctor of doctors) {
//             if (doctor.appointments && doctor.appointments.length > 0) {
//                 const formattedAppointments = doctor.appointments.map((appt: any) => ({
//                     appointmentId: appt.appointmentId,
//                     doctorName: doctor.personalDetails?.fullName || 'Unknown Doctor',
//                     date: appt.date,
//                     time: appt.time
//                 }));
//                 recentAppointments.push(...formattedAppointments);
//             }
//         }
        
//         // Sort by date (newest first) and limit to 5
//         const sortedAppointments = recentAppointments
//             .sort((a: any, b: any) => {
//                 const dateA = new Date(`${a.date}T${a.time.split('-')[0].trim()}`);
//                 const dateB = new Date(`${b.date}T${b.time.split('-')[0].trim()}`);
//                 return dateB.getTime() - dateA.getTime();
//             })
//             .slice(0, 5);
        
//         res.status(200).json({
//             totalDoctors,
//             verifiedDoctors,
//             pendingDoctors,
//             totalPatients,
//             totalAppointments,
//             recentAppointments: sortedAppointments
//         });
//     } catch (error) {
//         console.error('Error fetching dashboard stats:', error);
//         res.status(500).json({ message: 'An error occurred while fetching dashboard statistics' });
//     }
// };


// User Management
// const banUser = async (req: any, res: any) => {
//     try {
//         const userId = req.params.id;
        
//         const user = await User.findById(userId);
//         if (!user) return res.status(404).json({ message: 'User not found' });
        
//         // Add a banned flag to the user
//         user.isBanned = true;
//         await user.save();
        
//         res.status(200).json({ message: 'User banned successfully' });
//     } catch (error) {
//         console.error('Error banning user:', error);
//         res.status(500).json({ message: 'An error occurred while banning the user' });
//     }
// };

// const unbanUser = async (req: any, res: any) => {
//     try {
//         const userId = req.params.id;
        
//         const user = await User.findById(userId);
//         if (!user) return res.status(404).json({ message: 'User not found' });
        
//         // Remove the banned flag
//         user.isBanned = false;
//         await user.save();
        
//         res.status(200).json({ message: 'User unbanned successfully' });
//     } catch (error) {
//         console.error('Error unbanning user:', error);
//         res.status(500).json({ message: 'An error occurred while unbanning the user' });
//     }
// };

export {
    test,
    loginAdmin,
    getPendingDoctors,
    getVerifiedDoctors,
    verifyDoctor,
    rejectDoctor,
    getDoctorDetails,
    getAllPatients,
    getPatientDetails,
    getAllAppointments,
    getAppointmentDetails,
    deletePatient,
    deleteDoctor,
    getAllDoctors,
    getAllSessions
   // getDashboardStats
    // banUser,
    // unbanUser,
};