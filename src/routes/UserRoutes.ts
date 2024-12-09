import express from "express";
const { loginUser, logoutUser, signUpUser ,forgotPassword, resetPassword} = require("../controllers/UserController");
const router = express.Router();

// router.post('/signup' , signUpUser);
router.route("/signup").post(signUpUser);

router.route("/login").post(loginUser);

router.route("/logout").post(logoutUser);

router.route("/password/forgot").post(forgotPassword);

router.route("/password/reset/:token").put(resetPassword);


//export
export default router;  