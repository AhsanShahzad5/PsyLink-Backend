import express from "express";
import {
  getUserComplaints,
  createComplaint,
  rejectComplaint,
  getInProgressComplaints,
  startOnComplaint,
  resolveComplaint,
  getPendingComplaints,
} from "../controllers/ComplaintController";
const {isAuthenticated,authorizeRoles} = require("../middlewares/auth")

const router = express.Router();

// Get all complaints for a specific user
router.get("/user/:userId", isAuthenticated , getUserComplaints);


// Create a new complaint
router.post("/", isAuthenticated , createComplaint);

//admin
// Update a complaint status (could be restricted to admin roles)
router.get("/pending",  getPendingComplaints);
router.get("/in-progress",  getInProgressComplaints);

// Action routes
router.patch("/start/:complaintId",  startOnComplaint);
router.patch("/resolve/:complaintId",  resolveComplaint);
router.patch("/reject/:complaintId",  rejectComplaint);

export default router;