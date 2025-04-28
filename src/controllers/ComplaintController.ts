import { Request, Response } from "express";
import ComplaintModel from "../models/ComplaintsModel";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

// Get all complaints for a specific user
export const getUserComplaints = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log("this is userId in backend ",userId)
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const complaints = await ComplaintModel.find({ userId })
      .sort({ date: -1 }) // Sort by date descending (newest first)
      .lean();

    res.status(200).json(complaints);
  } catch (error) {
    console.error("Error fetching user complaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};


// Create a new complaint
export const createComplaint = async (req: Request, res: Response) => {
  try {
    const { userId, userName, userRole, issueType, issueDescription, issueImg } = req.body;

    // Validate required fields
    if (!userId || !userName || !userRole || !issueType || !issueDescription) {
      return res.status(400).json({ error: "Missing required fields" });
    }


    let imageUrl = "";
    if (issueImg) {
      const uploadedResponse = await cloudinary.uploader.upload(issueImg);
      imageUrl = uploadedResponse.secure_url;
    }

    // Create new complaint
    const newComplaint = new ComplaintModel({
      userId,
      userName,
      userRole,
      issueType,
      issueDescription,
      issueImg: imageUrl || "", // Handle optional image
      status: "Pending", // Default status
      date: new Date(),
    });

    // Save complaint to database
    const savedComplaint = await newComplaint.save();

    res.status(201).json(savedComplaint);
  } catch (error) {
    console.error("Error creating complaint:", error);
    res.status(500).json({ error: "Failed to create complaint" });
  }
};




//get pending request
export const getPendingComplaints = async (req:any, res:any) => {
  try {
    const pendingComplaints = await ComplaintModel.find({
      status: "Pending",
    }).sort({ date: -1 });

    res.status(200).json({ success: true, data: pendingComplaints });
  } catch (error:any) {
    console.error("Error fetching pending complaints:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending complaints",
      error: error.message,
    });
  }
};

// Get all in-progress complaints
export const getInProgressComplaints = async (req:any, res:any) => {
  try {
    const inProgressComplaints = await ComplaintModel.find({
      status: "In Progress",
    }).sort({ date: -1 });

    res.status(200).json({ success: true, data: inProgressComplaints });
  } catch (error:any) {
    console.error("Error fetching in-progress complaints:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch in-progress complaints",
      error: error.message,
    });
  }
};

// Start processing a complaint
export const startOnComplaint = async (req:any, res:any) => {
  try {
    const { complaintId } = req.params;

    const complaint = await ComplaintModel.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Complaint is not in pending status",
      });
    }

    // Update the complaint status to "In Progress"
    complaint.status = "In Progress";
    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Complaint processing started",
      data: complaint,
    });
  } catch (error:any) {
    console.error("Error starting complaint processing:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start complaint processing",
      error: error.message,
    });
  }
};

// Resolve a complaint
export const resolveComplaint = async (req:any, res:any) => {
  try {
    const { complaintId } = req.params;

    const complaint = await ComplaintModel.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "In Progress") {
      return res.status(400).json({
        success: false,
        message: "Complaint is not in progress",
      });
    }

    // Update the complaint status to "Resolved"
    complaint.status = "Resolved";
    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Complaint resolved successfully",
      data: complaint,
    });
  } catch (error:any) {
    console.error("Error resolving complaint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve complaint",
      error: error.message,
    });
  }
};

// Reject a complaint
export const rejectComplaint = async (req:any, res:any) => {
  try {
    const { complaintId } = req.params;

    const complaint = await ComplaintModel.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "In Progress") {
      return res.status(400).json({
        success: false,
        message: "Complaint is not in progress",
      });
    }

    // Update the complaint status to "Rejected"
    complaint.status = "Rejected";
    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Complaint rejected",
      data: complaint,
    });
  } catch (error:any) {
    console.error("Error rejecting complaint:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject complaint",
      error: error.message,
    });
  }
};