// src/models/Payment.js

import mongoose from 'mongoose';
const { Schema } = mongoose;

const PaymentSchema = new Schema({
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  appointmentId: {
    type: String, 
    required: true,
  },
  stripePaymentId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded' , 'succeeded' , 'confirmed'],
    default: 'pending',
  },
  date: {
    type: String, 
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
  isAnonymous: {
    type: Boolean,
  },
  patientName: {
    type: String,
    required: true,
  }
});

PaymentSchema.pre('save', function(next) {
  if (this.isAnonymous === true) {
    this.patientName = "Anonymous";
  }
  next();
});

export default mongoose.model('Payment', PaymentSchema);