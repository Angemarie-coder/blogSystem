import express from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  commentPost,
  getUserBlogStats,
  getUserPosts
} from '../controllers/post.controller';
import { authorize, isAuthor } from '../middleware/authorize';
import { authenticated } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/posts', getPosts);
router.get('/posts/:id', getPostById);

// Protected routes
router.use(authenticated);

router.post('/posts', authorize(['admin', 'user']), createPost);
router.put('/posts/:id', authorize(['admin', 'user']), isAuthor, updatePost);
router.delete('/posts/:id', authorize(['admin', 'user']), isAuthor, deletePost);
router.post('/posts/:id/like', authorize(['admin', 'user']), likePost);
router.post('/posts/:id/comment', authorize(['admin', 'user']), commentPost);
router.get('/user/stats', authorize(['admin', 'user']), getUserBlogStats);
router.get('/user/posts', authorize(['admin', 'user']), getUserPosts);

export default router;