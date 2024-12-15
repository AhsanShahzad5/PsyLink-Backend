import express from "express";
import { test } from "../controllers/DoctorController";
import { getPendingDoctors, loginAdmin, verifyDoctor } from "../controllers/AdminController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.get('/test' , test);
router.post('/login' , loginAdmin);

router.get('/doctors/pending', getPendingDoctors);
router.post('/doctors/verify/:id', verifyDoctor);
// router.patch('/doctors/verify/:id', isAuthenticated, authorizeRoles('admin'), verifyDoctor);



//export
export default router;