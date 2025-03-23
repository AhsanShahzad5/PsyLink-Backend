import express from "express";
import { test } from "../controllers/DoctorController";
import { addNote, bookAppointment,  deleteNote,  editNote,  getAllNotes,  getVerifiedDoctors, getBookedAppointments } from "../controllers/PatientController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.route('/test').get(isAuthenticated,authorizeRoles("admin"), test);


router.get('/doctors', getVerifiedDoctors);
router.post('/book/appointment', isAuthenticated, bookAppointment);
router.get('/booked/appointment', isAuthenticated, getBookedAppointments);
router.post('/notes/addNotes',  addNote);
router.put('/notes/editNotes', editNote);
router.delete('/notes/deleteNotes', deleteNote);
router.get('/notes/getallnotes/:patientId', getAllNotes);
//export
export default router;