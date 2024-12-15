import mongoose from 'mongoose';

const { Schema } = mongoose;

const DoctorSchema = new Schema({
    // Login/Account Details
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
        specialisation: { type: String, required: true },
        pmdcNumber: { type: String, required: true },
        educationalBackground: { type: String, required: true },
        licenseImage: { type: String, required: true }, // URL for license image
        cnicNumber: { type: String, required: true },
        availableHours: [
            {
                day: { type: String, required: true }, // e.g., 'Monday'
                startTime: { type: String, required: true }, // e.g., '09:00'
                endTime: { type: String, required: true },   // e.g., '17:00'
            },
        ],
        consultationFee: { type: Number, required: true },
        bankDetails: {
            accountHolderName: { type: String, required: true },
            accountNumber: { type: String, required: true },
            bankName: { type: String, required: true },
            branchCode: { type: String, required: true },
            iban: { type: String, required: true },
        },
    },

    // Clinic Setup
    clinic: {
        fullName: { type: String, required: false },
        specialisation: { type: String, required: false },
        educationBackground: { type: String, required: false },
        image: { type: String, required: false }, // URL for clinic image
        consultationFee: { type: Number, required: true },
        // ratings: { type: Number, default: 0 }, // Average ratings
    },

    availability: [
        {
            date: { type: String, required: true }, // e.g., '2024-12-15'
            slots: [
                {
                    time: { type: String, required: true }, // e.g., '09:00-10:00'
                    status: { type: String, enum: ['available', 'busy', 'booked'], default: 'available' },
                    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Patient ID
                },
            ],
        },
    ],
    
    // Appointments
    appointments: [
        {
            patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            date: { type: String, required: true },
            time: { type: String, required: true },
        },
    ],

    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Doctor', DoctorSchema);
