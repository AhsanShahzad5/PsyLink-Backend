import mongoose,{Schema} from 'mongoose';

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Patient', 'Doctor', 'Admin','patient', 'doctor', 'admin'],
    required: true,
  },
});

const User = mongoose.model('User', userSchema);
export default User;
