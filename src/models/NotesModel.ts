// Importing necessary libraries
import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the interface for a Note
type NoteDocument = Document & {
  _id: Types.ObjectId;
  date: Date;
  title: string;
  content: string;
};

// Define the Note schema
const NoteSchema: Schema = new Schema<NoteDocument>({
  
  date: {
    type: Date,
    default: Date.now, // Default to the current date
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
  },
});

// Create and export the model
const NoteModel = mongoose.model<NoteDocument>('Note', NoteSchema);
export default NoteModel;
