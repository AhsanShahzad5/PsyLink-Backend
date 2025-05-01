

import express, { NextFunction, Request, Response } from 'express';
import { v2 as cloudinary } from "cloudinary";
import Post from '../models/PsyncModel';
import User from '../models/UserModel';
import mongoose from 'mongoose';

const test = (req: Request, res: Response) => {
  res.json({ message: 'welcome to doctor' });
}

const CreatePost = async (req: Request, res: Response) => {
  try {
    const { userId, title, description, img, series } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate title and description length
    if (title.length > 250) {
      return res.status(400).json({ error: "Title cannot exceed 250 characters" });
    }
    // if (description.length > 500) {
    //   return res.status(400).json({ error: "Description cannot exceed 500 characters" });
    // }

    // Handle optional image upload
    let imageUrl = "";
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      imageUrl = uploadedResponse.secure_url;
    }

    // Prepare the series array (convert to array if only one id is sent)
    const seriesArray = series ? (Array.isArray(series) ? series : [series]) : [];

    // Create and save the post
    const newPost = new Post({
      title,
      description,
      userId,
      img: imageUrl,
      series: seriesArray, // Save selected series ID(s)
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in creating post:", err.message);
  }
};



//get all posts from the database with the user details
const GetAllPosts = async (req: Request, res: Response) => {
  try {
    const posts = await Post.find().
      populate('series', 'title').sort({ createdAt: -1 });;
    // res.json(posts)

    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await User.findById(post.userId);
        return {
          ...post.toObject(), // Spread all fields from the Post object
          user: {
            _id: user?._id,
            name: user?.name,
            email: user?.email,
            role: user?.role,
            profilePicture: user?.profilePicture
          },
        };
      })
    );
    res.json(postsWithUserDetails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in getting posts:", err.message);
  }
};


//a delete post controller function 
const DeletePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;
    // res.json(postId);

    const userId = req.body.userId; // Assuming userId is sent in the request body
    const isAdmin = req.body.isAdmin; // Get the admin flag from request body

    const post = await Post.findById(postId);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // If user is not an admin, perform the regular authorization check
    if (!isAdmin && post.userId.toString() !== userId) {
      return res.status(403).json({ error: "You are not authorized to delete this post" });
    }

    // Admin users bypass the above check and can delete any post

    if (post.img) {
      const imgId = post.img?.split("/")?.pop()?.split(".")?.[0] ?? "";
      await cloudinary.uploader.destroy(imgId);
    }

    await Post.findByIdAndDelete(postId);

    res.json({ message: "Post deleted successfully" });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in deleting post:", err.message);
  }
};

//a delete post controller function 




// get a post by postId
const GetPostById = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId)
      .populate({
        path: 'series',
        select: '_id title' // Select only the _id and title fields from series
      });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Fetch user details
    const user = await User.findById(post.userId);

    // Add user details to the post
    const postWithUserDetails = {
      ...post.toObject(), // Convert Mongoose document to plain object
      user: user
        ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        }
        : null, // If user is not found, set it as null
    };

    res.json(postWithUserDetails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in getting post:", err.message);
  }
};


//a function to get all posts from the logged in user
const GetMyPosts = async (req: Request, res: Response) => {
  try {
    //        const userId = req.body.userId;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const posts = await Post.find({ userId }).populate('series', 'title').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in getting posts:", err.message);
  }
}

// Controller to get posts favorited by a user
const getMyFavoritedPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Find posts where the user is in `favouritedBy`
    const favoritedPosts = await Post.find({ favouritedBy: userId })
      .populate('series', 'title') // Populate series with its title
      .sort({ createdAt: -1 });

    // Fetch user details for each post
    const postsWithUserDetails = await Promise.all(
      favoritedPosts.map(async (post) => {
        const user = await User.findById(post.userId);
        return {
          ...post.toObject(), // Convert Mongoose document to plain object
          user: {
            _id: user?._id,
            name: user?.name,
            email: user?.email,
            role: user?.role,
            profilePicture: user?.profilePicture,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: postsWithUserDetails.length,
      posts: postsWithUserDetails,
    });
  } catch (error: any) {
    console.error("Error fetching favorited posts:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// add a function to favorite a post
// Toggle a post to/from favorites
const addPostToFavorite = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;
    const userId = req.body.userId;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    const userFavoritedPost = post.favouritedBy?.includes(userId);
    
    if (userFavoritedPost) {
      // Remove from favorites
      await Post.updateOne({ _id: postId }, { $pull: { favouritedBy: userId } });
      res.status(200).json({ message: "Post removed from favorites successfully" });
    } else {
      // Add to favorites
      post.favouritedBy?.push(userId);
      await post.save();
      res.status(200).json({ message: "Post added to favorites successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};


const likeUnlikePost = async (req: Request, res: Response) => {
  try {
    // basicall we get the id from req.params and rename it as postId
    const postId = req.params.postId;
    const userId = req.body.userId;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // Unlike post
      // updating one post we use updateOne
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      res.status(200).json({ message: "Post unliked successfully" });
    } else {
      // Like post
      post.likes.push(userId);
      await post.save();
      res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// comment on a post
const commentOnPost = async (req: Request, res: Response) => {
  try {
    const { userId, comment } = req.body;
    const postId = req.params.postId;

    const post = await Post.findById(postId);   // find the post by id     
    // check if the post exists or not          
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Add the comment to the post
    post.comments.push({ userId, comment });
    await post.save();

    res.status(200).json({ message: "Comment added successfully" });
  }
  catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in commenting on post:", err.message);
  }
}

//get all comments on a post
const getPostComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;

    //const postId = req.body.postId;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post.comments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in getting post comments:", err.message);
  }
}


// search a post by title 
const searchPostByTitle = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const posts = await Post.find({ title: { $regex: title, $options: "i" } });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    console.error("Error in searching post:", (err as Error).message);
  }
}


// Controller to update post
// In PsyncController.ts

const UpdatePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;
    const { userId, title, description, img } = req.body;

    // Validate the post ID
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid Post ID" });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user is authorized to update this post
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: "You are not authorized to update this post" });
    }

    // Validate title and description length
    if (title && title.length > 100) {
      return res.status(400).json({ error: "Title cannot exceed 100 characters" });
    }

    // Handle optional image update
    let imageUrl = post.img; // Default to existing image
    if (img && img !== post.img) {
      // If image changed, upload new image
      const uploadedResponse = await cloudinary.uploader.upload(img);
      imageUrl = uploadedResponse.secure_url;

      // Delete old image if exists
      if (post.img) {
        const imgId = post.img?.split("/")?.pop()?.split(".")?.[0] ?? "";
        await cloudinary.uploader.destroy(imgId);
      }
    }

    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        title: title || post.title,
        description: description || post.description,
        img: imageUrl,
      },
      { new: true } // Return the updated document
    );

    res.status(200).json(updatedPost);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    console.error("Error in updating post:", err.message);
  }
};


// Add these two controller functions to your existing controllers

// Controller to check if a user has liked a post
const checkLikeStatus = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has liked the post
    const isLiked = post.likes.includes(new mongoose.Types.ObjectId(userId));

    return res.status(200).json({ isLiked });
  } catch (error: any) {
    console.error("Error checking like status:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Controller to check if a user has favorited a post
const checkFavoriteStatus = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has favorited the post
    const isFavorited = post.favouritedBy?.includes(new mongoose.Types.ObjectId(userId)) || false;

    return res.status(200).json({ isFavorited });
  } catch (error: any) {
    console.error("Error checking favorite status:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Don't forget to add these functions to your exports
export {
  test, GetPostById, CreatePost, GetAllPosts, DeletePost, GetMyPosts,
  getMyFavoritedPosts, addPostToFavorite, likeUnlikePost, commentOnPost,
  searchPostByTitle, getPostComments, UpdatePost, checkLikeStatus, checkFavoriteStatus
};
