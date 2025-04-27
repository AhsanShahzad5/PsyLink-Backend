import express from "express";
import { test } from "../controllers/DoctorController";
import {
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
} from "../controllers/AdminController";

const router = express.Router();

// Test route
router.get('/test', test);

// Auth routes
router.post('/login', loginAdmin);

// Doctor management routes
router.get('/doctors/pending', getPendingDoctors);
router.post('/doctors/verify/:id', verifyDoctor);


router.get('/doctors', getAllDoctors);
router.get('/doctors/verified', getVerifiedDoctors);
router.get('/doctors/:id', getDoctorDetails);
router.post('/doctors/reject/:id', rejectDoctor);
router.delete('/doctors/:id', deleteDoctor);

// Patient management routes
router.get('/patients', getAllPatients);
router.get('/patients/:id', getPatientDetails);
router.delete('/patients/:id', deletePatient);

// Appointment management routes
router.get('/appointments', getAllAppointments);
router.get('/appointments/:id', getAppointmentDetails);

router.get('/session', getAllSessions);

export default router;