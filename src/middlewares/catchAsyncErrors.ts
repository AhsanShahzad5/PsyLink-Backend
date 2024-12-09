import {Request,Response, NextFunction } from "express";

module.exports = (theFunction:any) => (req:Request,res:Response,next:NextFunction) => {
    Promise.resolve(theFunction(req,res,next)).catch(next);
}