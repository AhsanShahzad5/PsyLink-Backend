import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import User from '../models/UserModel';
import bcryptjs from 'bcryptjs'


const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to patient' });
}

export {test}