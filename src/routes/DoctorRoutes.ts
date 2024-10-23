import express from "express";
import { test } from "../controllers/DoctorController";
const router = express.Router();

router.get('/test' , test);


//export
export default router;