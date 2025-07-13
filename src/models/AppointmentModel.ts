import mongoose, { Schema, Document } from 'mongoose';

const AppointmentSchema = new Schema({
  appointmentId: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['booked', 'cancelled', 'completed', 'confirmed','missed'],
    default: 'booked'
  },
  rating: {
    type: Number,
    required: false
  },
  review: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
});

// Middleware to handle anonymous patient
AppointmentSchema.pre('save', function (next) {
  if (this.isAnonymous) {
    this.patientName = 'Anonymous';
  }
  next();
});

export default mongoose.model('Appointment', AppointmentSchema);
