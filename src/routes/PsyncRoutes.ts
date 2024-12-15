import express from "express";
import { test , CreatePost, GetAllPosts, DeletePost, GetMyPosts, getMyFavoritedPosts, addPostToFavorite, likeUnlikePost, commentOnPost} from "../controllers/PsyncController";
const router = express.Router();

router.get('/test' , test);

router.delete('/deletePost/:postId' , DeletePost);

router.post('/createPost' ,CreatePost);
router.post('/addToFavourites/:postId' , addPostToFavorite);
router.post('/likeUnlikePost/:postId' , likeUnlikePost);
router.post('/commentOnPost/:postId' , commentOnPost);
router.get('/getAllPosts' , GetAllPosts);
router.get('/getMyPosts' , GetMyPosts);
router.get('/getMyFavouritePosts' , getMyFavoritedPosts);




//export
export default router;