import express from "express";
import { getUserDetails } from "../controllers/UserController";
const { loginUser, logoutUser, signUpUser ,forgotPassword, resetPassword} = require("../controllers/UserController");
const router = express.Router();

// router.post('/signup' , signUpUser);
// router.route("/signup").post(signUpUser);

 //router.route("/login").post(loginUser);

// router.route("/logout").post(logoutUser);

// router.route("/password/forgot").post(forgotPassword);

// router.route("/password/reset/:token").put(resetPassword);
router.post("/signup", signUpUser);

router.post("/login", loginUser);

router.post("/logout", logoutUser);

router.post("/password/forgot", forgotPassword);

router.put("/password/reset/:token", resetPassword);

router.get('/userDetails/:userId' , getUserDetails);



//export
export default router;  