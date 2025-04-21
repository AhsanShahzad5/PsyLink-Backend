import { Request, Response } from "express";
import Series from "../models/PsyncSeriesModel";
import Post from '../models/PsyncModel';
import User from '../models/UserModel';
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

/**
 * Create a new series
 */

export const createANewSeries = async (req: Request, res: Response) => {
  try {
    const { userId, title, postTitle, postDescription, img } = req.body;

    // 🔹 1️⃣ Validate Required Fields
    if (!title || !userId) {
      return res.status(400).json({ error: "Title and user ID are required" });
    }

    // 🔹 2️⃣ Check if User Exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🔹 3️⃣ Validate Title Length
    if (title.length > 100) {
      return res.status(400).json({ error: "Series title cannot exceed 100 characters" });
    }

    // 🔹 4️⃣ Check for Duplicate Series Title
    const existingSeries = await Series.findOne({ title, createdBy: userId });
    if (existingSeries) {
      return res.status(400).json({ error: "Series title already exists" });
    }

    let postId = null;
    let imageUrl = "";

    // 🔹 5️⃣ Handle Optional Image Upload
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      imageUrl = uploadedResponse.secure_url;
    }

    // 🔹 6️⃣ If Post Details are Provided, Create the Post
    if (postTitle && postDescription) {
      // Validate Post Title & Description Length
      if (postTitle.length > 100) {
        return res.status(400).json({ error: "Post title cannot exceed 100 characters" });
      }
      if (postDescription.length > 500) {
        return res.status(400).json({ error: "Post description cannot exceed 500 characters" });
      }

      const newPost = new Post({
        title: postTitle,
        description: postDescription,
        userId,
        img: imageUrl,
      });

      await newPost.save();
      postId = newPost._id;
    }

    // 🔹 7️⃣ Create the Series
    const newSeries = new Series({
      title,
      createdBy: userId,
      posts: postId ? [postId] : [], // If a post exists, add it to the series
    });

    await newSeries.save();

    // 🔹 8️⃣ Return Response
    res.status(201).json({
      message: "Series created successfully",
      series: newSeries,
      post: postId ? { _id: postId, title: postTitle, description: postDescription, img: imageUrl } : null,
    });

  } catch (err: any) {
    console.error("Error creating series:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Get all series
 */
export const getAllSeries = async (req: Request, res: Response) => {
  try {
    const seriesList = await Series.find().populate("createdBy", "name email");
    res.status(200).json(seriesList);
  } catch (error) {
    console.error("Error fetching series:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Get a series by title
 */
export const getSeriesByTitle = async (req: Request, res: Response) => {
  try {
    const { title } = req.params;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const series = await Series.findOne({ title }).populate("posts");

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    res.status(200).json(series);
  } catch (error) {
    console.error("Error fetching series by title:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Add a post to an existing series
 */

export const addPostToExistingSeries = async (req: Request, res: Response) => {
  try {
    const { seriesId, userId, title, description, img } = req.body;

    // ✅ Validate IDs
    if (!mongoose.Types.ObjectId.isValid(seriesId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid series ID or user ID" });
    }

    // ✅ Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Check if the series exists
    const series = await Series.findById(seriesId);
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    // ✅ Validate post title and description length
    if (!title || title.length > 30) {
      return res.status(400).json({ error: "Title is required and cannot exceed 30 characters" });
    }
    if (!description || description.length > 250) {
      return res.status(400).json({ error: "Description is required and cannot exceed 250 characters" });
    }

    // ✅ Handle optional image upload
    let imageUrl = "";
    if (img) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(img);
        imageUrl = uploadedResponse.secure_url;
      } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(500).json({ error: "Image upload failed" });
      }
    }

    // ✅ Create a new post
    const newPost = new Post({
      title,
      description,
      userId,
      img: imageUrl,
    });
    await newPost.save();

    // ✅ Check if the post is already in the series
    if (series.posts.includes(newPost._id as any)) {
      return res.status(400).json({ error: "Post already exists in this series" });
    }

    // ✅ Add the post to the series
    series.posts.push(newPost._id as any);
    await series.save();

    res.status(201).json({
      message: "Post added to series successfully",
      series,
      newPost, // Return the newly created post
    });
  } catch (error: any) {
    console.error("Error adding post to series:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};



/**
 * Get a series by ID
 */
export const getSeriesById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
    //   res.json(id); // ✅ Debugging Step
     
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid series ID" });
      }
  
      const series = await Series.findById(id).populate("posts").populate("createdBy", "name email");
  
      if (!series) {
        return res.status(404).json({ error: "Series not found" });
      }
  
      res.status(200).json(series);
    } catch (error) {
      console.error("Error fetching series by ID:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  

  export const deleteSeries = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body; // Assuming userId is sent in the request body
  
      // ✅ Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid series ID" });
      }
  
      // ✅ Find the series
      const series = await Series.findById(id);
      if (!series) {
        return res.status(404).json({ error: "Series not found" });
      }
  
      // ✅ Check if the user is the creator
      if (series.createdBy.toString() !== userId) {
        return res.status(403).json({ error: "You are not authorized to delete this series" });
      }
  
      // ✅ Delete the series (but keep posts)
      await Series.findByIdAndDelete(id);
  
      res.status(200).json({ message: "Series deleted successfully (posts were kept)" });
    } catch (error) {
      console.error("Error deleting series:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  

// fix this later
//   export const deleteSeriesAndPosts = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { userId } = req.body; // Assuming userId is sent in the request body

//     // ✅ Validate ID
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ error: "Invalid series ID" });
//     }

//     // ✅ Find the series and populate full post data
//     const series = await Series.findById(id).populate({
//       path: "posts",
//       select: "img _id" // ✅ Ensure we fetch 'img' field along with '_id'
//     });

//     if (!series) {
//       return res.status(404).json({ error: "Series not found" });
//     }

//     // ✅ Check if the user is the creator
//     if (series.createdBy.toString() !== userId) {
//       return res.status(403).json({ error: "You are not authorized to delete this series" });
//     }

//     // ✅ Delete Posts and their Images (if any)
//     for (const post of series.posts) {
//       if (post?.img) {
//         const imgId = post.img?.split("/")?.pop()?.split(".")?.[0] ?? "";
//         await cloudinary.uploader.destroy(imgId); // ✅ Delete image
//       }
//       await Post.findByIdAndDelete(post._id); // ✅ Delete post
//     }

//     // ✅ Finally, delete the series
//     await Series.findByIdAndDelete(id);

//     res.status(200).json({ message: "Series and its posts deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting series and posts:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
