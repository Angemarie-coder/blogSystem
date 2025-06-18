import { Response, NextFunction } from 'express';
import { PostService } from '../services/posts.service';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  CreatePostInput, 
  UpdatePostInput, 
  GetPostByIdInput, 
  SearchPostsInput 
} from '../schema/post.schema';
import { AuthenticatedRequest, ApiResponse } from '../types/common.types';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { Request } from 'express';
import { Post } from '../models/Post';
import { getRepository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { MoreThanOrEqual } from 'typeorm';

const postService = new PostService();
const postRepo = AppDataSource.getRepository(Post);

// @desc    Create a new post
// @route   POST /blog/posts
// @access  Private
export const createPost = asyncHandler(async (
  req: AuthenticatedRequest & CreatePostInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  console.log('Creating post with data:', req.body, 'User:', req.user);

  const { title, body, category, status, media } = req.body;

  if (!req.user) {
    throw new UnauthorizedError('User not found');
  }

  if (!req.user.id) {
    throw new Error('User ID is missing');
  }

  try {
    const post = await postService.create({
      title,
      body,
      category,
      status,
      media,
      authorId: +req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post }
    });
  } catch (error) {
    console.error('Error in createPost:', error);
    throw error;
  }
});

// @desc    Get all posts with pagination
// @route   GET /blog/posts
// @access  Public
export const getPosts = asyncHandler(async (
  req: AuthenticatedRequest & SearchPostsInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { page = '1', limit = '10' } = req.query;

  const result = await postService.findAll({
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    include: [
      {
        model: 'User',
        as: 'author',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.json({
    success: true,
    message: 'Posts retrieved successfully',
    data: { posts: result.data, count: result.count, totalPages: result.totalPages }
  });
});

// @desc    Get single post by ID
// @route   GET /blog/posts/:id
// @access  Public
export const getPostById = asyncHandler(async (
  req: AuthenticatedRequest & GetPostByIdInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { id } = req.params;

  const post = await postService.findById(+id, {
    include: [
      {
        model: 'User',
        as: 'author',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  res.json({
    success: true,
    message: 'Post retrieved successfully',
    data: { post }
  });
});

// @desc    Update a post
// @route   PUT /blog/posts/:id
// @access  Private (Owner only)
export const updatePost = asyncHandler(async (
  req: AuthenticatedRequest & UpdatePostInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { id } = req.params;
  const { title, body, category, status, media } = req.body;

  const post = await postService.findById(+id);
  if (!post) {
    throw new NotFoundError('Post');
  }

  if (!req.user) {
    throw new UnauthorizedError('User not found');
  }

  if (post.author.id !== req.user.id) {
    throw new UnauthorizedError('Not authorized, not the author');
  }

  const updatedPost = await postService.update(+id, { title, body, category, status, media });

  res.json({
    success: true,
    message: 'Post updated successfully',
    data: { post: updatedPost }
  });
});

// @desc    Delete a post
// @route   DELETE /blog/posts/:id
// @access  Private (Owner only)
export const deletePost = asyncHandler(async (
  req: AuthenticatedRequest & GetPostByIdInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { id } = req.params;

  const post = await postService.findById(+id);
  if (!post) {
    throw new NotFoundError('Post');
  }

  if (!req.user) {
    throw new UnauthorizedError('User not found');
  }

  if (post.author.id !== req.user.id) {
    throw new UnauthorizedError('Not authorized, not the author');
  }

  const deleted = await postService.delete(+id);
  if (!deleted) {
    throw new Error('Failed to delete post');
  }

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
});

// Like a post
export const likePost = async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id);
  const post = await postRepo.findOne({ where: { id: postId } });
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  post.likes += 1;
  await postRepo.save(post);
  res.json({ success: true, message: 'Post liked', data: { likes: post.likes } });
};

// Comment on a post (just increment count for now)
export const commentPost = async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id);
  const post = await postRepo.findOne({ where: { id: postId } });
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  post.comments += 1;
  await postRepo.save(post);
  res.json({ success: true, message: 'Comment added', data: { comments: post.comments } });
};

// User blog stats with time filter
export const getUserBlogStats = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new UnauthorizedError('User not authenticated');
  const userId = req.user.id;
  const { period } = req.query; // daily, weekly, monthly, yearly
  let dateFrom: Date | undefined;
  const now = new Date();
  if (period === 'daily') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'weekly') {
    const day = now.getDay();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  } else if (period === 'monthly') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'yearly') {
    dateFrom = new Date(now.getFullYear(), 0, 1);
  }
  const where: any = { author: { id: userId } };
  if (dateFrom) where.createdAt = MoreThanOrEqual(dateFrom);
  const posts = await postRepo.find({ where });
  const totalBlogs = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
  res.json({ success: true, data: { totalBlogs, totalLikes, totalComments } });
};

// Get current user's posts
export const getUserPosts = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  if (!req.user) throw new UnauthorizedError('User not authenticated');
  const { page = '1', limit = '10' } = req.query;
  const userId = req.user.id;
  const result = await postService.findAll({
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    where: { author: { id: userId } },
    include: [
      {
        model: 'User',
        as: 'author',
        attributes: ['id', 'name', 'email']
      }
    ]
  });
  res.json({
    success: true,
    message: 'User posts retrieved successfully',
    data: { posts: result.data, count: result.count, totalPages: result.totalPages }
  });
});