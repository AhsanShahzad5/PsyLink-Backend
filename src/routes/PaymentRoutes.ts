// src/routes/paymentRoutes.js

import express from 'express';
import { 
  createPaymentIntent, 
  confirmPayment,
  getPaymentsByDoctor,
  getPaymentsByPatient,
  getPaymentDetails
} from '../controllers/PaymentController';
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

// Create a payment intent (for patient)
router.post('/patient/create-payment-intent', isAuthenticated ,  createPaymentIntent);

// Confirm payment and book appointment
router.post('/patient/confirm-payment', isAuthenticated, confirmPayment);

// Get doctor's payments
router.get('/doctor/:doctorId', isAuthenticated  ,getPaymentsByDoctor);

// Get patient's payments
router.get('/patient/:patientId', isAuthenticated , getPaymentsByPatient);

// Get detailed payment info
router.get('/details/:paymentId', isAuthenticated , getPaymentDetails);







// // Create a payment intent (for patient)
// router.post('/patient/create-payment-intent', isAuthenticated , authorizeRoles('patient'), createPaymentIntent);

// // Confirm payment and book appointment
// router.post('/patient/confirm-payment', isAuthenticated , authorizeRoles('patient'), confirmPayment);

// // Get doctor's payments
// router.get('/doctor/:doctorId', isAuthenticated , authorizeRoles('doctor', 'admin'), getPaymentsByDoctor);

// // Get patient's payments
// router.get('/patient/:patientId', isAuthenticated , authorizeRoles('patient', 'admin'), getPaymentsByPatient);

// // Get detailed payment info
// router.get('/details/:paymentId', isAuthenticated , getPaymentDetails);

export default router;