import express from "express";
import { checkVerificationStatus, markSlotsAsBusy, setAvailableSlots, setupClinic, submitPersonalDetails, submitProfessionalDetails, test } from "../controllers/DoctorController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.get('/test' , test);

router.post('/details/personal', isAuthenticated, submitPersonalDetails);
router.post('/details/professional', isAuthenticated, submitProfessionalDetails);
router.get('/status', isAuthenticated, checkVerificationStatus);

router.post('/clinic/setup', isAuthenticated, setupClinic);

router.post('/availability/set', isAuthenticated, setAvailableSlots);
router.post('/availability/busy', isAuthenticated, markSlotsAsBusy);

//export
export default router;