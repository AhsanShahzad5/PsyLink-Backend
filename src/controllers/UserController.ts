import express, { Request, Response } from 'express';
import generateTokenAndSetCookie from '../utils/generateTokenAndSetCookie';
import User from '../models/UserModel';
import bcryptjs from 'bcryptjs'


const signUpUser = async (req:Request, res:Response) => {
    try {
        const { name ,email, password , role} = req.body;
        //check if user exists , by looking for email "or" username
        const user = await User.findOne({
            $or: [{ email }]
        });
        if (user) {
            return res.status(400).json({ message: "user already exists" })
        }

        //hash the passsowrd to make it secure
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // now create a new user
        const newUser = new User({
            name ,
            email,
            password: hashedPassword,
            role: role
        })
        await newUser.save();

        if (newUser) {
            generateTokenAndSetCookie(newUser._id, res);
            res.status(201).json({
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            })
        } else {
            res.status(400).json({ message: "invalid data" })
        }


    } catch (error) {
        res.status(500).json({ error: (error as Error).message })
        console.log(`Error in signing up user : ${(error as Error).message}`);
    }


}

const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email, role });
        const isPasswordCorrect = await bcryptjs.compare(password, user?.password || "");

        if (!user || !isPasswordCorrect) {
            return res.status(400).json({ error: "Invalid email, password, or role" });
        }

        generateTokenAndSetCookie(user._id, res);

        //show who the user is after logging in
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        });

    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
        console.log(`Error in logging in user: ${(error as Error).message}`);
    }
};


const logoutUser = async (req: Request, res: Response) => {
    try {
        //clear the cookie
        res.cookie("jwt", " ", { maxAge: 1 /*1 milisecond */ });
        res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message })
        console.log(`Error in logout : ${(error as Error).message}`);
    }
}
export {signUpUser, loginUser,logoutUser}