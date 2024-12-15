import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the Series Schema
const SeriesSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Series title is required"],
      trim: true,
      maxLength: [100, "Series title cannot exceed 100 characters"],
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Post', // Reference to the Post model
        required: false, // Not all series will have posts initially
      },
    ], // Array of post IDs that are part of this series
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true, // Every series needs a creator
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create the Series model
const Series = mongoose.model<Document & {
  title: string;
  posts: Types.ObjectId[];
  createdBy: Types.ObjectId;
}>('Series', SeriesSchema);

export default Series;
