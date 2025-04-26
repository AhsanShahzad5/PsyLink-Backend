import express from "express";
import { checkVerificationStatus, getAvailability, getClinicDetails, markSlotsAsBusy, saveClinicDetails, setAvailableSlots, submitPersonalDetails, submitProfessionalDetails, test } from "../controllers/DoctorController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.get('/test' , test);

router.post('/details/personal', isAuthenticated, submitPersonalDetails);
router.post('/details/professional', isAuthenticated, submitProfessionalDetails);
router.get('/status', isAuthenticated, checkVerificationStatus);

// router.post('/clinic/setup', isAuthenticated, setupClinic);
// router.get('/get/clinic-details', isAuthenticated, getClinicDetails);

router.post('/availability/set', isAuthenticated, setAvailableSlots);
router.post('/availability/busy', isAuthenticated, markSlotsAsBusy);

router.get('/clinic-details', isAuthenticated, getClinicDetails);
router.post('/clinic-details', isAuthenticated, saveClinicDetails);

router.get('/availability', isAuthenticated, getAvailability);


// router.post('/clinic/update', isAuthenticated, updateClinicDetails);

//export
export default router;

