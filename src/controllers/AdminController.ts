

import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import Admin from '../models/AdminModel';

const test = (req: Request, res: Response) => {
    res.json({ message: 'welcome to doctor' });
}

// no signup for admin , admin will be created directly in database

const loginAdmin = async (req: Request, res: Response) => {
    try {
        const { username, password , role} = req.body;
        const user = await Admin.findOne({ username });
       
        if (!user || user.password !== password) {
            return res.status(400).json({ error: "Invalid username or password" });
        }

        generateTokenAndSetCookie(user._id, res);

        //show who the user is after logging in
        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: role,
        });
        console.log("backend + " , role);
        
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
        console.log(`Error in logging in user: ${(error as Error).message}`);
    }
};

export {test, loginAdmin}