import mongoose,{Schema} from 'mongoose';

const AdminNotificationSchema = new Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true,
    },
    type: { type: String, enum: ['doctor_verification', 'other'], required: true },
    message: { type: String, required: true }, // Customizable message for the notification
    status: { type: String, enum: ['unread', 'read'], default: 'unread' }, // Notification status
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('AdminNotification', AdminNotificationSchema);
