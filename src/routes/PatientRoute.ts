import express from "express";
import { submitPersonalDetails, test } from "../controllers/DoctorController";
import {moodLogging, addNote, bookAppointment, getPrescriptionById, deleteNote,  editNote,  getAllNotes,  getVerifiedDoctors, getBookedAppointments, applyProgram, getPatientDetails, updatePatientPersonalDetails, submitPatientPersonalDetails, getOngoingPrograms, markTaskComplete, getTodayMood, getMoodsForLast15Days, getPatientPrescriptions, saveReview, getPreviousPrograms, createMoodProgressReport, getPatientReports, getReportById, getHistoryAppointments, rescheduleAppointment } from "../controllers/PatientController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.route('/test').get(isAuthenticated,authorizeRoles("admin"), test);

router.get("/details/personal", isAuthenticated, getPatientDetails);
router.post('/details/personal', isAuthenticated, submitPatientPersonalDetails );
router.put('/details/personal/update', isAuthenticated, updatePatientPersonalDetails);

router.get('/doctors', getVerifiedDoctors);
router.post('/book/appointment', isAuthenticated, bookAppointment);
router.get('/booked/appointment', isAuthenticated, getBookedAppointments);
router.get('/history/appointment', isAuthenticated, getHistoryAppointments);
router.post('/notes/addNotes',  addNote);
router.put('/notes/editNotes', editNote);
router.delete('/notes/deleteNotes', deleteNote);
router.get('/notes/getallnotes/:patientId', getAllNotes);
router.post('/programs/applyProgram',isAuthenticated, applyProgram);
router.get('/getOngoingPrograms',isAuthenticated, getOngoingPrograms);
router.post('/markTaskComplete',isAuthenticated, markTaskComplete);
router.get('/prescription/:patientId',getPatientPrescriptions)
router.get('/prescription-appointment/:appointmentId', getPrescriptionById);
router.get('/programs/previous',isAuthenticated,getPreviousPrograms)
router.post('/moodLogging',isAuthenticated, moodLogging);
router.get('/getTodayMood',isAuthenticated, getTodayMood);
router.get('/getMoodHistory',isAuthenticated, getMoodsForLast15Days);

router.post('/createMoodProgressReport',isAuthenticated, createMoodProgressReport);
router.get('/getPatientReports',isAuthenticated, getPatientReports);
router.get('/getReportById/:reportId',isAuthenticated, getReportById);
router.post('/reschedule-appointment', rescheduleAppointment);


router.post('/reviews/save', isAuthenticated, saveReview);

//export
export default router;