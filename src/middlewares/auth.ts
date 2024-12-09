import { NextFunction, Request, Response } from "express";

const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwtLib = require("jsonwebtoken"); // Rename the imported jsonwebtoken module
import User from "../models/UserModel";

exports.isAuthenticated = catchAsyncErrors(async (req: any, res: any, next: any) => {
    console.log("Cookies: ", req.cookies);

    const { token: token } = req.cookies; // Rename the destructured jwt to token

    console.log(token);

    if (!token) {
        return next(new ErrorHandler("Please Login to access this resource", 401));
    }

    const decodedData = jwtLib.verify(token, process.env.JWT_SECRET); // Use jwtLib to access verify function

    req.user =  await User.findById(decodedData.id); // Assign user details to req.user

    next();
});



exports.authorizeRoles = (...roles:any) => {    
    return (req:any,res:any,next:any) => {

        
        const Roles = roles.map((role:any) => role.toLowerCase());

     
        if (!req.user || !Roles.includes(req.user.role.toLowerCase())) {
            return next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
        }

        next();   
    };
};

