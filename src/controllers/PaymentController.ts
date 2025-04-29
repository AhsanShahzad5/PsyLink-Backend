// src/controllers/paymentController.js

import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import Payment from '../models/PaymentModel';
import Doctor from '../models/DoctorModel';
import Patient from '../models/PatientModel';
import User from '../models/UserModel';
import Appointment from '../models/AppointmentModel';
import mongoose from 'mongoose';

// Initialize Stripe with your test secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20', // Use the latest API version
});

const createPaymentIntent = async (req: any, res: any) => {
  try {
    const {
      amount,
      patientId,
      doctorId,
      date,
      time
    } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({ success: false, message: 'Required booking details are missing' });
    }

    // Check if patient and doctor exist by matching the userId field
    const patient = await Patient.findOne({ userId: patientId });
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Create a unique appointment ID
    const appointmentId = uuidv4();

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe uses cents
      currency: 'usd',
      metadata: {
        patientId,
        doctorId,
        appointmentId,
        date,
        time,
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      appointmentId,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment intent' });
  }
};

const confirmPayment = async (req: any, res: any) => {
  try {
    const {
      paymentIntentId,
      patientId,
      doctorId,
      appointmentId,
      date,
      time
    } = req.body;

    // Retrieve the payment intent from Stripe to confirm it's completed
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${paymentIntent.status}`
      });
    }

    // Create a new payment record in your database
    const payment = new Payment({
      amount: paymentIntent.amount / 100, // Convert cents back to dollars
      patientId,
      doctorId,
      appointmentId,
      stripePaymentId: paymentIntentId,
      status: 'completed',
      date,
      time,
      createdAt: new Date(),
    });

    await payment.save();

    // Find doctor and patient
    // const doctor = await Doctor.findById(doctorId);
    // let patient = await Patient.findById(patientId);

    // Check if patient and doctor exist by matching the userId field
    let patient = await Patient.findOne({ userId: patientId });
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (!patient) {
      const user = await User.findById(patientId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
      patient = new Patient({ userId: patientId, email: user.email });
    }

    // Get doctor and patient names for appointment record
    const userPatient = await User.findById(patientId);
    const patientName = patient.personalInformation?.fullName || userPatient.name || userPatient.email;

    const userDoctor = await User.findById(doctor.userId);
    const doctorName = doctor.personalDetails?.fullName || userDoctor.name || userDoctor.email;

    // Create the appointment record
    const appointment = new Appointment({
      appointmentId,
      date,
      time,
      patientId,
      patientName,
      doctorId,
      doctorName,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentId: payment._id
    });

    await appointment.save();

    // Update doctor's appointments array
    doctor.appointments.push({
      appointmentId,
      patientId,
      date,
      time,
      PaymentStatus: 'done'
    });

    await doctor.save();

    // Update patient's upcoming appointments

    // i commeneted our but claude gave it 


    // if (!patient.appointments) {
    //   patient.appointments = { upcoming: [] };
    // }

    patient.appointments?.upcoming.push({
      appointmentId,
      doctorId,
      date,
      time,
      status: 'confirmed'
    });

    await patient.save();

    // Update the doctor's availability slots for this date and time
    await Doctor.findOneAndUpdate(
      { userId: doctorId },
      {
        $set: {
          "availability.$[dateElem].slots.$[timeElem].status": "booked",
          "availability.$[dateElem].slots.$[timeElem].bookedBy": patientId
        }
      },
      {
        arrayFilters: [
          { "dateElem.date": date },
          { "timeElem.time": time }
        ],
        new: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and appointment booked',
      paymentId: payment._id,
      appointmentId
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
};

const getPaymentsForDoctor = async (req: any, res: any) => {
  try {
    const doctorId  = req.user._id;

    // First get the payments without population
    const payments = await Payment.find({ doctorId }).sort({ createdAt: -1 });

    // Create an array to store enhanced payment data
    const enhancedPayments = [];

    // Process each payment to add patient information
    for (const payment of payments) {
      // Find patient by userId (since patientId in Payment is actually userId)
      const patient = await Patient.findOne({ userId: payment.patientId });

      // Create a payment object with additional patient data
      // Create a payment object with additional patient data
      const enhancedPayment = payment.toObject() as typeof payment & { patientData?: any };

      if (patient) {
        // Create a copy of personalInformation without the image
        const { image, ...personalInfoWithoutImage } = patient.personalInformation as { image?: string; [key: string]: any };

        enhancedPayment.patientData = {
          _id: patient._id,
          userId: patient.userId,
          email: patient.email,
          personalInformation: personalInfoWithoutImage
        };
      } else {
        enhancedPayment.patientData = null;
      }

      enhancedPayments.push(enhancedPayment);
    }

    res.status(200).json({
      success: true,
      count: enhancedPayments.length,
      data: enhancedPayments
    });
  } catch (error) {
    console.error('Error retrieving doctor payments:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payments' });
  }
};



const getAllPayments = async (req: any, res: any) => {
  try {
    // Pagination setup
    // const page = parseInt(req.query.page, 10) || 1;
    // const limit = parseInt(req.query.limit, 10) || 10;
    // const skip = (page - 1) * limit;

    // Count total documents for pagination info
    //const total = await Payment.countDocuments();

    // Get payments with pagination
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      //.skip(skip)
      //.limit(limit);

    // Create an array to store simplified payment data
    const simplifiedPayments = [];

    // Process each payment to add only the required fields
    for (const payment of payments) {
      // Get doctor name from Doctor model
      const doctor = await User.findById(payment.doctorId, 'name');
      
      // Get patient name from User model (not Patient)
      const user = await User.findById(payment.patientId, 'name');
      
      // Create a simplified payment object
      const simplifiedPayment = {
        _id: payment._id,
        doctorName: doctor ? doctor.name : 'Unknown Doctor',
        patientName: user ? user.name : 'Unknown Patient',
        status: payment.status,
        date: payment.date,
        amount: payment.amount
      };

      simplifiedPayments.push(simplifiedPayment);
    }

    res.status(200).json({
      success: true,
      count: simplifiedPayments.length,
      // total,
      // pages: Math.ceil(total / limit),
      // currentPage: page,
      data: simplifiedPayments
    });
  } catch (error) {
    console.error('Error retrieving all payments:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payments' });
  }
};


/**
 * Get details of a specific payment
 * This controller retrieves detailed information about a specific payment
 * including doctor and patient details with bank account information
 */
const getPaymentDetails = async (req: any, res: any) => {
  try {
    const { paymentId } = req.params;

    // Validate if paymentId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment ID format' 
      });
    }

    // Find the payment
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    // Get doctor information including bank account
    const doctor = await Doctor.findOne({ userId: payment.doctorId });
    
    // Get patient information
    const patient = await Patient.findOne({ userId: payment.patientId });

    // Format the transaction date and time
    const transactionDate = `${payment.date} ${payment.time}`;

    // Create a simplified payment details object with requested fields
    const paymentDetails = {
      paymentId: payment._id,
      amount: payment.amount,
      status: payment.status,
      transactionDate: transactionDate,
      doctorName: doctor ? `Dr. ${doctor.personalDetails?.fullName}` : 'Unknown Doctor',
      doctorBankAccount: doctor?.professionalDetails?.bankDetails?.accountNumber || 'Not available',
      patientName: patient ? patient.personalInformation?.fullName : 'Unknown Patient',
      stripePaymentId: payment.stripePaymentId,
      appointmentId: payment.appointmentId
    };

    res.status(200).json({
      success: true,
      data: paymentDetails
    });
  } catch (error) {
    console.error('Error retrieving payment details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve payment details' 
    });
  }
};


const getPaymentsByPatient = async (req: any, res: any) => {
  try {
    const { patientId } = req.params;

    const payments = await Payment.find({ patientId })
      .populate({
        path: 'doctorId',
        select: 'professionalDetails.specialisation personalDetails.fullName email'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Error retrieving patient payments:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payments' });
  }
};





export { createPaymentIntent, confirmPayment, getPaymentsForDoctor, getPaymentsByPatient , getAllPayments,getPaymentDetails };