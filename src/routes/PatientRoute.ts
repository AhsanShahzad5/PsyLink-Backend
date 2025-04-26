import express from "express";
import { submitPersonalDetails, test } from "../controllers/DoctorController";
import {moodLogging, addNote, bookAppointment,  deleteNote,  editNote,  getAllNotes,  getVerifiedDoctors, getBookedAppointments, applyProgram, getPatientDetails, updatePatientPersonalDetails, submitPatientPersonalDetails, getOngoingPrograms, markTaskComplete, getTodayMood, getMoodsForLast15Days } from "../controllers/PatientController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.route('/test').get(isAuthenticated,authorizeRoles("admin"), test);

router.get("/details/personal", isAuthenticated, getPatientDetails);
router.post('/details/personal', isAuthenticated, submitPatientPersonalDetails );
router.put('/details/personal/update', isAuthenticated, updatePatientPersonalDetails);

router.get('/doctors', getVerifiedDoctors);
router.post('/book/appointment', isAuthenticated, bookAppointment);
router.get('/booked/appointment', isAuthenticated, getBookedAppointments);
router.post('/notes/addNotes',  addNote);
router.put('/notes/editNotes', editNote);
router.delete('/notes/deleteNotes', deleteNote);
router.get('/notes/getallnotes/:patientId', getAllNotes);
router.post('/programs/applyProgram',isAuthenticated, applyProgram);
router.get('/getOngoingPrograms',isAuthenticated, getOngoingPrograms);
router.post('/markTaskComplete',isAuthenticated, markTaskComplete);

router.post('/moodLogging',isAuthenticated, moodLogging);
router.get('/getTodayMood',isAuthenticated, getTodayMood);
router.get('/getMoodHistory',isAuthenticated, getMoodsForLast15Days);
//export
export default router;