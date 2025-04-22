import express from "express";
import { test , CreatePost, GetAllPosts, DeletePost, GetMyPosts, getMyFavoritedPosts, addPostToFavorite, likeUnlikePost, commentOnPost, searchPostByTitle, getPostComments, GetPostById} from "../controllers/PsyncController";
import { addPostToExistingSeries, createANewSeries, deleteSeries, getAllSeries, getSeriesById, getSeriesByTitle, getUserSeriesWithPosts } from "../controllers/PsyncSeriesController";
const router = express.Router();

router.get('/test' , test);

router.delete('/deletePost/:postId' , DeletePost);

router.post('/createPost' ,CreatePost);
router.get('/getPostComments/:postId' , getPostComments);

router.post('/addToFavourites/:postId' , addPostToFavorite);
router.post('/likeUnlikePost/:postId' , likeUnlikePost);
router.post('/commentOnPost/:postId' , commentOnPost);
router.get('/post/:postId' , GetPostById);

router.get('/getAllPosts' , GetAllPosts);
router.get('/getMyPosts' , GetMyPosts);
router.get('/getMyFavouritePosts' , getMyFavoritedPosts);
router.get('/search' , searchPostByTitle)


// series controllers


router.post("/series/create", createANewSeries); // Create a new series
router.get("/series/all", getAllSeries); // Get all series
router.post("/series/add-post", addPostToExistingSeries); // Add a post to an existing series

router.get("/series/:id", getSeriesById); // Get a series by ID
router.get("/series/title/:title", getSeriesByTitle); // Get a series by title
router.delete("/series/:id", deleteSeries); // ✅ Deletes only the series, keeps posts

router.get("/series/user/:userId", getUserSeriesWithPosts);   //gets all series of a user with its posts

//export
export default router;