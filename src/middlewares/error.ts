import { Request, Response, NextFunction } from "express";
const errorHandler = require('../utils/errorhandler');

module.exports = (err:ErrorHandler, req:Request ,res:Response, next:NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error"
    
    res.status(err.statusCode).json({
        success:false,
        error: err.message
    });
};