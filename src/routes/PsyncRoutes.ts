import express from "express";
import { test , CreatePost, GetAllPosts, DeletePost, GetMyPosts, getMyFavoritedPosts, addPostToFavorite, likeUnlikePost, commentOnPost, searchPostByTitle, getPostComments} from "../controllers/PsyncController";
const router = express.Router();

router.get('/test' , test);

router.delete('/deletePost/:postId' , DeletePost);

router.post('/createPost' ,CreatePost);
router.get('/getPostComments/:postId' , getPostComments);

router.post('/addToFavourites/:postId' , addPostToFavorite);
router.post('/likeUnlikePost/:postId' , likeUnlikePost);
router.post('/commentOnPost/:postId' , commentOnPost);
router.get('/getAllPosts' , GetAllPosts);
router.get('/getMyPosts' , GetMyPosts);
router.get('/getMyFavouritePosts' , getMyFavoritedPosts);
router.get('/search' , searchPostByTitle)




//export
export default router;