import mongoose, { Schema, Document } from 'mongoose';

const PatientSchema = new Schema({
  // Link to User Model
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Personal Details
//   personalDetails: {
//     fullName: { type: String, required: true },
//     dateOfBirth: { type: Date, required: false },
//     gender: { type: String, enum: ['Male', 'Female', 'Other'], required: false },
//     phoneNo: { type: String, required: false },
//     image: { type: String, required: false }, // URL for profile image
//   },

  // Appointments
  appointments: {
    upcoming: [
      {
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
        date: { type: String, required: true },
        time: { type: String, required: true },
        status: { type: String, enum: ['booked', 'confirmed', 'cancelled'], default: 'booked' }, // Status of appointment
      },
    ],
    previous: [
      {
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
        date: { type: String, required: true },
        time: { type: String, required: true },
        status: { type: String, enum: ['completed', 'cancelled'], required: true },
        feedback: { type: String, required: false }, // Optional feedback on the appointment
        rating: { type: Number, min: 1, max: 5, required: false }, // Rating for the doctor
      },
    ],
  },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Patient', PatientSchema);
