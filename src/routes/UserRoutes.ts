import express from "express";
import { loginUser, signUpUser } from "../controllers/UserController";
const router = express.Router();

router.post('/signup' , signUpUser);
router.post('/login' , loginUser);


//export
export default router;