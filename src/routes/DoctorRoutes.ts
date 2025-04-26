import express from "express";
import { checkVerificationStatus, getClinicDetails, getDetailsForPrescription, getDoctorDetails, getDoctorProfessionalDetails, getUpcomingAppointments, markSlotsAsBusy, savePrescription, setAvailableSlots, setupClinic, submitPersonalDetails, submitProfessionalDetails, test, updateDoctorPersonalDetails } from "../controllers/DoctorController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.get('/test' , test);

router.get("/details/personal", isAuthenticated, getDoctorDetails);
router.post('/details/personal', isAuthenticated, submitPersonalDetails);
router.put('/details/personal/update', isAuthenticated, updateDoctorPersonalDetails);

router.get('/details/professional', isAuthenticated, getDoctorProfessionalDetails);
router.post('/details/professional', isAuthenticated, submitProfessionalDetails);
router.get('/status', isAuthenticated, checkVerificationStatus);

router.post('/clinic/setup', isAuthenticated, setupClinic);
router.get('/get/clinic-details', isAuthenticated, getClinicDetails);

router.post('/availability/set', isAuthenticated, setAvailableSlots);
router.post('/availability/busy', isAuthenticated, markSlotsAsBusy);

router.get('/appointments/upcoming', isAuthenticated, getUpcomingAppointments);
router.get('/:appointmentId/details', isAuthenticated, getDetailsForPrescription);

router.post('/prescription/save', isAuthenticated, savePrescription);

//export
export default router;