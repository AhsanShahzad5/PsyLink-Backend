import mongoose,{Schema} from 'mongoose';

const NotificationSchema = new Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Notification', NotificationSchema);
