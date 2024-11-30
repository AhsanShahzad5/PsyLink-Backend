import express from "express";
import { test } from "../controllers/DoctorController";
import { loginAdmin } from "../controllers/AdminController";
const router = express.Router();

router.get('/test' , test);
router.post('/login' , loginAdmin);


//export
export default router;