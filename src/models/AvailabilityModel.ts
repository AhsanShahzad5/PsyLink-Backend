import mongoose,{Schema} from 'mongoose';

const AvailabilitySchema = new Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    date: String,
    slots: [{ time: String, status: { type: String, enum: ['available', 'booked', 'busy'] } }],
});
