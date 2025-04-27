import express from "express";
import { deletePrivateReview, getDetailsForPrescription, getDoctorProfessionalDetails, getPrivateReviews, getReviews, getUpcomingAppointments, savePrescription } from "../controllers/DoctorController";

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

router.get('/appointments/upcoming', isAuthenticated, getUpcomingAppointments);
router.get('/:appointmentId/details', isAuthenticated, getDetailsForPrescription);

router.post('/prescription/save', isAuthenticated, savePrescription);
router.get('/clinic-details', isAuthenticated, getClinicDetails);
router.post('/clinic-details', isAuthenticated, saveClinicDetails);

router.get('/availability', isAuthenticated, getAvailability);
router.get('/reviews', isAuthenticated, getReviews);


router.get('/private-reviews',isAuthenticated, getPrivateReviews);
router.delete('/private-reviews/:reviewId', isAuthenticated, deletePrivateReview);


// router.post('/clinic/update', isAuthenticated, updateClinicDetails);

//export
export default router;

