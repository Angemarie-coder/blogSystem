import { Response, NextFunction } from 'express';
import { UserService } from '../services/users.service';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  UpdateUserInput,
  GetUserByIdInput, 
  SearchUsersInput, 
  DeleteUserInput 
} from '../schema/user.schemas';
import { AuthenticatedRequest, ApiResponse } from '../types/common.types';
import { NotFoundError, ConflictError } from '../utils/errors';
import { getRepository } from 'typeorm';
import { User } from '../models/User';
import { Request } from 'express';
import { AppDataSource } from '../config/database';

const userService = new UserService();
const userRepo = AppDataSource.getRepository(User);

export const getAllUsers = asyncHandler(async (
  req: AuthenticatedRequest, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const users = await userService.findAll();
  
  res.json({
    success: true,
    message: 'Users retrieved successfully',
    data: { users }
  });
});

export const search = asyncHandler(async (
  req: AuthenticatedRequest & SearchUsersInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { name } = req.query;
  
  const users = name ? await userService.findByName(name) : [];
  
  res.json({
    success: true,
    message: 'Search completed successfully',
    data: { users, count: users.length }
  });
});

export const getById = asyncHandler(async (
  req: AuthenticatedRequest & GetUserByIdInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { id } = req.params;
  
  const user = await userService.findById(id);
  if (!user) {
    throw new NotFoundError('User');
  }
  
  res.json({
    success: true,
    message: 'User retrieved successfully',
    data: { user }
  });
});

export const updateUser = asyncHandler(async (
  req: AuthenticatedRequest & UpdateUserInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if user exists
  const existingUser = await userService.findById(id);
  if (!existingUser) {
    throw new NotFoundError('User');
  }

  // Check email uniqueness if email is being updated
  if (updateData.email && updateData.email !== existingUser.email) {
    const userWithEmail = await userService.findByEmail(updateData.email);
    if (userWithEmail) {
      throw new ConflictError('Email is already in use');
    }
  }
  
  const updatedUser = await userService.update(id, updateData);
  
  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: updatedUser }
  });
});

export const deleteUser = asyncHandler(async (
  req: AuthenticatedRequest & DeleteUserInput, 
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const { id } = req.params;
  
  const user = await userService.findById(id);
  if (!user) {
    throw new NotFoundError('User');
  }
  
  const deleted = await userService.delete(id);
  if (!deleted) {
    throw new Error('Failed to delete user');
  }
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get current user profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'User not authenticated' });
  const userId = req.user.id;
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage } });
};

// Update current user profile (name, profileImage)
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'User not authenticated' });
  const userId = req.user.id;
  const { name, profileImage } = req.body;
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (name) user.name = name;
  if (profileImage) user.profileImage = profileImage;
  await userRepo.save(user);
  res.json({ success: true, message: 'Profile updated', data: { name: user.name, profileImage: user.profileImage } });
};