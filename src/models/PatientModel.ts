import mongoose, { Schema, Document } from 'mongoose';

const PatientSchema = new Schema({
  // Link to User Model
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: false,
    unique: true, // Ensure no duplicate emails among doctors
},

  // Personal Details
  personalInformation: {
    fullName: { type: String, required: false },
    age: { type: Number, required: false },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: false },
    disability: { type: String, default: null },
    country: { type: String, required: false },
    city: { type: String, required: false },
    phoneNo: { type: String, required: false },
    image: { type: String, required: false }, // URL for profile image
  },


  // Appointments
  appointments: {
    upcoming: [
      { appointmentId:{ type: String, required: true },
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
        date: { type: String, required: true },
        time: { type: String, required: true },
        status: { type: String, enum: ['booked', 'confirmed', 'cancelled'], default: 'booked' }, // Status of appointment
        isAnonymous: { type : Boolean, default : false }
      },
    ],
    previous: [
      { appointmentId:{ type: String, required: true },
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
        date: { type: String, required: true },
        time: { type: String, required: true },
        status: { type: String, enum: ['completed', 'cancelled', 'missed'], required: true },
        feedback: { type: String, required: false }, // Optional feedback on the appointment
        rating: { type: Number, min: 1, max: 5, required: false }, // Rating for the doctor
        isAnonymous: { type : Boolean, default : false }
      },
    ],
  },
  doctorPreference: {
    type: String,
    enum: ['Psychiatrist', 'Psychologist', 'None'],
    default: 'None',
  },
  dailyMood: [
    {
      date: { type: Date, required: true },
      mood: { type: String, required: true },
    },
  ],
  programs: {
    applied: [
      {
        program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
        planName: {type:String , required:true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        dailyProgress: [
          {
            date: { type: Date, required: true },
            tasks: [
              {
                taskName: { type: String, required: true },
                repetitions: { type: Number, required: true },
                completed: { type: Boolean, default: false },
              },
            ],
          },
        ],
      },
    ],
    previous: [
      {
        program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
        planName: {type:String , required:true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        dailyProgress: [
          {
            date: { type: Date, required: true },
            tasks: [
              {
                taskName: { type: String, required: true },
                repetitions: { type: Number, required: true },
                completed: { type: Boolean, default: false },
              },
            ],
          },
        ],
      },
    ],
  },
  
  notes: [
    {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',default: []
    },
  ],
  files: [
    {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Patient', PatientSchema);
