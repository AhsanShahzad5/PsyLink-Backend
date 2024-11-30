import mongoose,{Schema} from 'mongoose';

const adminSchema = new Schema({
 
  username: {
    type: String,
    required: true,
    unique: true,
    
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'admin'],
    required: true,
  },
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
