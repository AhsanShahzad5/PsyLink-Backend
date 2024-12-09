import express from "express";
import { test } from "../controllers/DoctorController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

router.route('/test').get(isAuthenticated,authorizeRoles("admin"), test);


//export
export default router;