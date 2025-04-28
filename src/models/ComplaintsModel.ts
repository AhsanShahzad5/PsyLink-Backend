import mongoose, { Schema, Document } from "mongoose";

export interface IComplaint extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  issueType: "Payment Issue" | "Psync Harrasment Issue" | "Session Issue";
  issueDescription: string;
  issueImg: string;
  status: "Pending" | "In Progress" | "Resolved" | "Rejected";
  date: Date;
}

const ComplaintSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    issueType: {
      type: String,
      enum: ["Payment Issue", "Psync Harrasment Issue", "Session Issue"],
      required: true,
    },
    issueDescription: {
      type: String,
      required: true,
    },
    issueImg: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const ComplaintModel = mongoose.model<IComplaint>("Complaint", ComplaintSchema);

export default ComplaintModel;