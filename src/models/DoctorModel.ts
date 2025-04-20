import mongoose from 'mongoose';

const { Schema } = mongoose;

const DoctorSchema = new Schema({
    // Login/Account Details 
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
    
    status: { type: String, enum: ['pending', 'verified'], default: 'pending' }, // Pending or Verified

    // Personal Details
    personalDetails: {
        fullName: { type: String, required: false },
        dateOfBirth: { type: Date, required: false },
        gender: { type: String, enum: ['Male', 'Female', 'Other'], required: false },
        country: { type: String, required: false },
        city: { type: String, required: false },
        phoneNo: { type: String, required: false },
        image: { type: String, required: false }, // URL for image
    },

    // Professional Details
    professionalDetails: {
        specialisation: { type: String, required: false },
        pmdcNumber: { type: String, required: false },
        educationalBackground: { type: String, required: false },
        licenseImage: { type: String, required: false }, // URL for license image
        cnicNumber: { type: String, required: false },
        availableHours: [
            {
                // day: { type: String, required: true }, // e.g., 'Monday'
                startTime: { type: String, required: false }, // e.g., '09:00'
                endTime: { type: String, required: false },   // e.g., '17:00'
            },
        ],
        consultationFee: { type: Number, required: false },
        bankDetails: {
            accountHolderName: { type: String, required: false },
            accountNumber: { type: String, required: false },
            bankName: { type: String, required: false },
            branchCode: { type: String, required: false },
            iban: { type: String, required: false },
        },
    },

    // Clinic Setup
    clinic: {
        fullName: { type: String, required: false },
        specialisation: { type: String, required: false },
        educationBackground: { type: String, required: false },
        image: { type: String, required: false }, // URL for clinic image
        consultationFee: { type: Number, required: false },
        city: { type: String, required: false },
        country: { type: String, required: false },
        startTime: { type: String, required: false },
        endTime: { type: String, required: false },
        // ratings: { type: Number, default: 0 }, // Average ratings
    },

    availability: [
        {
            date: { type: String, required: false }, // e.g., '2024-12-15'
            slots: [
                {
                    time: { type: String, required: false }, // e.g., '09:00-10:00'
                    status: { type: String, enum: ['available', 'busy', 'booked'], default: 'available' },
                    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Patient ID
                },
            ],
        },
    ],

    // Appointments
    appointments: [
        {   appointmentId:{ type: String, required: true },
            patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
            date: { type: String, required: false },
            time: { type: String, required: false },
        },
    ],

    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Doctor', DoctorSchema);
