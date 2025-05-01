import mongoose from 'mongoose';

const { Schema } = mongoose;

const DoctorSchema = new Schema({ 
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    email: {
        type: String,
        required: false,
        unique: true,
    },
    
    rating:{
        TotalStars:{ type: Number, required: false, default: 0},
        TotalReviews:{ type: Number, required: false , default: 0}
    },

    status: { type: String, enum: ['pending', 'verified'], default: 'pending' },

    personalDetails: {
        fullName: { type: String, required: false },
        dateOfBirth: { type: Date, required: false },
        gender: { type: String, enum: ['Male', 'Female', 'Other'], required: false },
        country: { type: String, required: false },
        city: { type: String, required: false },
        phoneNo: { type: String, required: false },
        image: { type: String, required: false },
        description: { type: String, required: false },
    },

    professionalDetails: {
        specialisation: { type: String, required: false },
        pmdcNumber: { type: String, required: false },
        educationalBackground: { type: String, required: false },
        licenseImage: { type: String, required: false },
        cnicNumber: { type: String, required: false },
        availableHours: [
            {
                startTime: { type: String, required: false },
                endTime: { type: String, required: false },
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

    clinic: {
        fullName: { type: String, required: false },
        specialisation: { type: String, required: false },
        educationBackground: { type: String, required: false },
        description: { type: String, required: false },
        image: { type: String, required: false },
        consultationFee: { type: Number, required: false },
        city: { type: String, required: false },
        country: { type: String, required: false },
        startTime: { type: String, required: false },
        endTime: { type: String, required: false },
    },

    privateReviews: [
        {
            patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            patientName: { type: String, required: true },
            privateReview: { type: String, required: true }
        }
    ],

    availability: [
        {
            date: { type: String, required: false },
            slots: [
                {
                    time: { type: String, required: false }, 
                    status: { type: String, enum: ['available', 'busy', 'booked'], default: 'available' },
                    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Patient ID
                },
            ],
        },
    ],

    appointments: [
        {   
            appointmentId:{ type: String, required: true },
            patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
            date: { type: String, required: false },
            time: { type: String, required: false },
        },
    ],

    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Doctor', DoctorSchema);

