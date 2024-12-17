import express, { NextFunction, Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import User from '../models/UserModel';
import bcryptjs from 'bcryptjs'
import "dotenv/config"
const ErrorHandler = require('../utils/errorhandler');
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const signUpUser = catchAsyncErrors(async (req:Request, res:Response, next:NextFunction) => {
    
    const { name ,email, password , role} = req.body;

    const user = await User.findOne({ email });

    if (user) {
        return next(new ErrorHandler("user already exist", 400))
    }

  
    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role 
    })

    if (newUser) {

        // generateTokenAndSetCookie(newUser._id, res);

        const token = jwt.sign({id:newUser._id }, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRE});


        res
        .status(201)
        .cookie("token", token, {
            expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        })
        .set("Authorization", `Bearer ${token}`)
        .json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            token
            
           
        })
    } else {
        res.status(400).json({ message: "invalid data" })
    }


})

const loginUser = catchAsyncErrors(async (req: Request, res: Response, next:NextFunction) => {
    
    const { email, password, role } = req.body;
    const user = await User.findOne({ email, role });
    const isPasswordCorrect = await bcryptjs.compare(password, user?.password || "");

    if (!user || !isPasswordCorrect) {
        return next( new ErrorHandler("Invalid email, password, or role", 400))
    }

    // generateTokenAndSetCookie(user._id, res);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

    res
      .status(200)
      .cookie("token", token, {
        expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        httpOnly: true, // Secure the cookie (accessible only by the server)
        
      })
      .set("Authorization", `Bearer ${token}`) // Set token in the Authorization header as well
      .json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    

})


const logoutUser = catchAsyncErrors(async (req: Request, res: Response) => {
    
    
    res.cookie("jwt", " ", { maxAge: 1 /*1 milisecond */ });
    res.status(200).json({ message: "User logged out successfully" });

})



//when click on forgot password

const forgotPassword = catchAsyncErrors(async (req: any, res: any, next: any) => {
    const user = await User.findOne({ email: req.body.email });
  
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }
  
    const resetToken = user.getResetPasswordToken();
  
    await user.save({ validateBeforeSave: false });
  
    // Updated to point to the frontend reset password page
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
    const message = `Your password reset token is:\n\n${resetPasswordUrl}\n\nIf you have not requested this email, please ignore it.`;
  
    try {
      await sendEmail({
        email: user.email,
        subject: `PSYLINK Account Password Recovery`,
        message,
      });
  
      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error in forgotPassword:", error.message);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
  
        await user.save({ validateBeforeSave: false });
  
        return next(new ErrorHandler("Failed to send email", 500));
      } else {
        console.error("Unknown error occurred:", error);
        return next(new ErrorHandler("An unexpected error occurred", 500));
      }
    }
  });
  





//ResetPassword after getting link on gmail

const resetPassword = catchAsyncErrors( async (req:any,res:any,next:any) => {

    
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");          

    const user = await User.findOne({     
        resetPasswordToken,
        resetPasswordExpire : { $gt : Date.now()}
    });

    if(!user){
        return next(new ErrorHandler ("Reset Password Token is invalid or has been expired" , 400));
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler("password does not match" ,400));
    }


    user.password = await bcryptjs.hash(req.body.password, 10);
    user.resetPasswordToken = undefined; 
    user.resetPasswordExpire = undefined;
   
    
    await user.save();

    const token = jwt.sign({id:user._id }, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRE});


        res
            .status(201)
            .cookie("token", token, { expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), httpOnly: true, })
            .json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
               
    });
});

const getUserDetails = async (req: Request, res: Response) => {
  try {
    // Extract userId from request params
    const { userId } = req.params;

    // Find user by ID in the database
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user details (exclude sensitive fields like password if needed)
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      
    });
  } catch (err: any) {
    // Handle errors
    console.error("Error fetching user details:", err.message);
    res.status(500).json({ error: "An error occurred while fetching user details" });
  }
};



export { signUpUser, loginUser, logoutUser, forgotPassword, resetPassword , getUserDetails};
