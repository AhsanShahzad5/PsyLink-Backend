import mongoose,{Document, Model, Schema} from 'mongoose';
const validator = require("validator");
const crypto = require("crypto");


const userSchema = new Schema<any>({
  name: {
    type: String,
    required: [true, "Please Enter Your Name"],
    maxLength:[30, "Name cannot exceed 30 characters"],
    minLength:[4, "Name should have more than 4 characters"],
    unique: true,
  },
  email: {
    type: String,
    required: [true, "Please Enter Your Email"],
    unique: true,
    lowercase: true,
    validate:[validator.isEmail,"Please Enter a valid Email"]
  },
  password: {
    type: String,
    required: [true, "Please Enter Your Password"],
    minLength: [8, "Password should be greater than 8 characters"],
  },
  
  role: {
    type: String,
    enum: ['Patient', 'Doctor', 'Admin','patient', 'doctor', 'admin'],
    required: true,
  },
    
  profilePicture: {
    type: String,
    default: ""  // Empty string as default
  },
  
  profileCompleted: {
    type: Boolean,
    default: false
  }
,
  resetPasswordToken : String,
  resetPasswordExpire : Date,
});

//Reset Password Token generation


userSchema.methods.getResetPasswordToken = function(){
    //generate token
    const resetToken = crypto.randomBytes(20).toString("hex");         //234234eweddw234fdsfs32 aese ajaye gi abhi isko hash men karna  
    
    //Hashing and adding to userSchema   abhi tak oper resetPassword Token men value ni di jo string tha
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");           //sha 256 algorithm pass karen ge method men   update bhi likhna zarori or digest convert karde ga lambi string men   or agar hex hta den tou phir se buffer value 9c 85 9c 70 2d 1f

    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000     //abhi jo time hua usme 15 minutes add sath multiply 1000 kyu ke milisec men hota

    return resetToken;
}



const User: Model<any>  = mongoose.model<any>('User', userSchema);
export default User;
