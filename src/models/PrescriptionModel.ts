import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for prescription items
interface PrescriptionItem {
  medicine: string;
  instructions: string;
}

// Define the interface for prescription document
export interface IPrescription extends Document {
  prescriptionId: string;
  date: Date;
  doctorName: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  patientGender: string;
  patientAge: string;
  prescription: PrescriptionItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Create the prescription schema
const PrescriptionSchema: Schema = new Schema(
  {
    prescriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    doctorName: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    patientId: {
      type: String,
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientGender: {
      type: String,
      required: true,
    },
    patientAge: {
      type: String,
      required: true,
    },
    prescription: [
      {
        medicine: {
          type: String,
          required: true,
        },
        instructions: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create a function to generate a unique prescription ID
// PrescriptionSchema.pre('save', async function (next) {
//   if (!this.isNew) {
//     return next();
//   }

//   const count = await this.constructor.countDocuments();
//   const date = new Date();
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const day = String(date.getDate()).padStart(2, '0');
  
//   this.prescriptionId = `PRSC-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
//   next();
// });

// Create and export the Prescription model
export default mongoose.model<IPrescription>('Prescription', PrescriptionSchema);