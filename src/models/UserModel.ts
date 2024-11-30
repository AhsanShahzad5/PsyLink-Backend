import mongoose,{Schema} from 'mongoose';

const userSchema = new Schema({
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
    enum: ['Patient', 'Doctor', 'Admin'],
    required: true,
  },
});

const User = mongoose.model('User', userSchema);
export default User;
