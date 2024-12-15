import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the structure of a comment
const CommentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
  },
});

// Define the Post Schema
const PostSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
      maxLength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Post description is required"],
      trim: true,
    },
    img: {
      type: String, // Cloudinary link will be stored here
      required: false, // Optional field
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    likes: {
      // Array of user IDs who liked the post
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    comments: [CommentSchema], // Array of comment objects
    favouritedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        default: [], // Optional array of user IDs
      },
    ],
    series: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Series', // Reference to the Series model
        default: [], // A post can belong to multiple series
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create the Post model
const Post = mongoose.model<Document & {
  title: string;
  description: string;
  img?: string; // Optional image link
  userId: Types.ObjectId;
  likes: Types.ObjectId[]; // Array of user IDs who liked the post
  comments: {
    userId: Types.ObjectId;
    comment: string;
  }[];
  favouritedBy?: Types.ObjectId[]; // Optional array of user IDs
  series?: Types.ObjectId[]; // Array of series IDs the post belongs to
}>('Post', PostSchema);

export default Post;
