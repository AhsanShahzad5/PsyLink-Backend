import express from 'express';
import { getAppointmentDetails } from '../controllers/AppointmentController';

const router = express.Router();

// Route to get appointment details by appointmentId
router.get('/:appointmentId', getAppointmentDetails);

export default router;