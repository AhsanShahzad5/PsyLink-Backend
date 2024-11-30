import express from "express";
import { loginUser, logoutUser, signUpUser } from "../controllers/UserController";
const router = express.Router();

router.post('/signup' , signUpUser);
router.post('/login' , loginUser);
router.post('/logout' , logoutUser);


//export
export default router;  