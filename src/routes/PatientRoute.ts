import express from "express";
import { test } from "../controllers/DoctorController";
import { bookAppointment, getVerifiedDoctors } from "../controllers/PatientController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.route('/test').get(isAuthenticated,authorizeRoles("admin"), test);


router.get('/doctors', getVerifiedDoctors);
router.post('/book/appointment', isAuthenticated, bookAppointment);



//export
export default router;