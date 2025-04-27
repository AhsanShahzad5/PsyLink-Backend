// src/controllers/paymentController.js

import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import Payment from '../models/PaymentModel';
import Doctor from '../models/DoctorModel';
import Patient from '../models/PatientModel';

// Initialize Stripe with your test secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20', // Use the latest API version
});

 const createPaymentIntent = async (req:any, res:any) => {
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

    // Check if patient and doctor exist
    const patient = await Patient.findById(patientId);
    const doctor = await Doctor.findById(doctorId);

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

const confirmPayment = async (req:any, res:any) => {
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

    // Update doctor's appointments array
    await Doctor.findByIdAndUpdate(doctorId, {
      $push: { 
        appointments: {
          appointmentId,
          patientId,
          date,
          time,
          PaymentStatus: 'done'
        }
      }
    });

    // Update patient's upcoming appointments
    
    // await Patient.findByIdAndUpdate(patientId, {
    //   $push: { 
    //     'appointments.upcoming': {
    //       appointmentId,
    //       doctorId,
    //       date,
    //       time,
    //       status: 'confirmed'
    //     }
    //   }
    // });

    // await Patient.findByIdAndUpdate(patientId, {
    //   $push: { 
    //     'appointments.upcoming': {
    //       appointmentId: appointmentId,  // Pass as an object property
    //       doctorId,
    //       date,
    //       time,
    //       status: 'confirmed'
    //     }
    //   }
    // });

    try {
      const updatedPatient = await Patient.findByIdAndUpdate(
        patientId,
        {
          $push: { 
            'appointments.upcoming': {
              appointmentId: appointmentId,  // Fixed to match schema
              doctorId,
              date,
              time,
              status: 'confirmed'
            }
          }
        },
        { new: true, runValidators: true }  // Return the updated document and run validators
      );
      
      console.log('Updated patient:', updatedPatient);
      if (!updatedPatient) {
        console.error('Patient update failed - document not found');
      }
    } catch (error) {
      console.error('Error updating patient appointments:', error);
      // Handle error appropriately
    }

    
    // Update the doctor's availability slots for this date and time
    await Doctor.updateOne(
      { 
        _id: doctorId,
        'availability.date': date,
        'availability.slots.time': time
      },
      {
        $set: {
          'availability.$[date].slots.$[slot].status': 'booked',
          'availability.$[date].slots.$[slot].bookedBy': patientId
        }
      },
      {
        arrayFilters: [
          { 'date.date': date },
          { 'slot.time': time }
        ]
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

const getPaymentsByDoctor = async (req:any, res:any) => {
  try {
    const { doctorId } = req.params;
    
    const payments = await Payment.find({ doctorId })
      .populate({
        path: 'patientId',
        select: 'personalInformation.fullName personalInformation.phoneNo email'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Error retrieving doctor payments:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payments' });
  }
};

const getPaymentsByPatient = async (req:any, res:any) => {
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

const getPaymentDetails = async (req:any, res:any) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'patientId',
        select: 'personalInformation.fullName personalInformation.phoneNo email'
      })
      .populate({
        path: 'doctorId',
        select: 'personalDetails.fullName professionalDetails.specialisation email'
      });
      
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Find the related appointment in the doctor's records
    const doctor = await Doctor.findById(payment.doctorId, {
      appointments: { $elemMatch: { appointmentId: payment.appointmentId } }
    });
    
    // Find the related appointment in the patient's records
    const patient = await Patient.findById(payment.patientId, {
      'appointments.upcoming': { $elemMatch: { appointmentId: payment.appointmentId } },
      'appointments.previous': { $elemMatch: { appointmentId: payment.appointmentId } }
    });
    
    let appointmentDetails = null;
    if (doctor && doctor.appointments && doctor.appointments.length > 0) {
      appointmentDetails = doctor.appointments[0];
    } else if (patient) {
      if (patient.appointments?.upcoming && 
          patient.appointments.upcoming.length > 0 && 
          patient.appointments.upcoming[0].appointmentId === payment.appointmentId) {
        appointmentDetails = patient.appointments.upcoming[0];
      } else if (patient.appointments?.previous && 
                patient.appointments.previous.length > 0 && 
                patient.appointments.previous[0].appointmentId === payment.appointmentId) {
        appointmentDetails = patient.appointments.previous[0];
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        payment,
        appointmentDetails
      }
    });
  } catch (error) {
    console.error('Error retrieving payment details:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment details' });
  }
};

export {createPaymentIntent, confirmPayment, getPaymentsByDoctor, getPaymentsByPatient, getPaymentDetails};