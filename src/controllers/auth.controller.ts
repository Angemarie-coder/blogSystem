import { NextFunction, Request, RequestHandler, Response} from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateJWT, generateResetToken, generateVerifyToken } from '../utils/jwt';
import { sendResetPassword, sendVerification } from '../utils/email';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest, ApiResponse } from '../types/common.types';
import { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

import { AuthService } from '../services/auth.service';
import { UserService } from '../services/users.service';

import { 
    Register, 
    Login, 
    ForgotPassword, 
    ResetPassword, 
    VerifyEmail, 
} from '../schema/auth.schemas';

const authService = new AuthService();
const userService = new UserService();

// User registration (only 'user' role)
export const register = asyncHandler(async (
    req: AuthenticatedRequest & Register, 
    res: Response<ApiResponse>,
    next: NextFunction
) => {
    const { name, email, password, role } = req.body;
    if (role && role !== 'user') {
        return res.status(403).json({ success: false, message: 'Only user registration allowed here.' });
    }
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }
    const newUser = await authService.create({ name, email, password, role: 'user' });
    const token = generateVerifyToken({ userId: newUser.id, email: newUser.email });
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    await sendVerification(newUser.email, verifyLink);
    res.status(201).json({
        success: true,
        message: 'User created successfully. Please check your email and verify your account.',
        data: {
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        }
    });
}) as RequestHandler;

// Admin registration (only 'admin' role)
export const privateRegister = asyncHandler(async (
    req: AuthenticatedRequest & Register, 
    res: Response<ApiResponse>,
    next: NextFunction
) => {
    const { name, email, password, role } = req.body;
    if (role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admin registration allowed here.' });
    }
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }
    const newUser = await authService.create({ name, email, password, role: 'admin' });
    res.status(201).json({
        success: true,
        message: 'Admin created successfully.',
        data: {
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        }
    });
}) as RequestHandler;

// Superuser registration (only 'superuser' role)
export const superRegister = asyncHandler(async (
    req: AuthenticatedRequest & Register, 
    res: Response<ApiResponse>,
    next: NextFunction
) => {
    const { name, email, password, role } = req.body;
    if (role !== 'superuser') {
        return res.status(403).json({ success: false, message: 'Only superuser registration allowed here.' });
    }
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }
    const newUser = await authService.create({ name, email, password, role: 'superuser' });
    res.status(201).json({
        success: true,
        message: 'Superuser created successfully.',
        data: {
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        }
    });
}) as RequestHandler;

// Verify email
// In auth.controller.ts
export const verifyEmail = asyncHandler(async (
    req: AuthenticatedRequest & VerifyEmail, 
    res: Response<ApiResponse>,
    next: NextFunction
) => {
    const { token } = req.params;
  
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { 
            userId: number; // Make sure this matches
            email: string; 
            type?: string 
        };
        
        // Verify token type if present
        if (payload.type && payload.type !== 'email_verification') {
            throw new UnauthorizedError('Invalid token type for email verification');
        }

        const user = await userService.findById(payload.userId);
        
        if (!user) {
            throw new NotFoundError('User');
        }
    
        if (user.isVerified) {
            throw new ConflictError('Email is already verified');
        }
    
        await userService.update(user.id, { isVerified: true });
    
        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Verification error:', error); // Add logging
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Verification token has expired. Please request a new verification email.');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid verification token. Please request a new verification email.');
        }
        throw error;
    }
});

// Login
export const login = asyncHandler(async (
    req: AuthenticatedRequest & Login, 
    res: Response<ApiResponse>,
    next: NextFunction
) => {
    const { email, password } = req.body;
  
    const user = await authService.login(email, password);
    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }
  
    if (!user.isVerified) {
        throw new ForbiddenError('Please verify your email before logging in');
    }
  
    if (!user.isActive) {
        throw new ForbiddenError('Your account has been deactivated');
    }
  
    const token = generateJWT(user);
  
    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role 
            },
            token
        }
    });
});

// Forgot Password
export const forgotPassword = asyncHandler(async (
    req: AuthenticatedRequest & ForgotPassword, 
    res: Response<ApiResponse>,
    next: NextFunction
) => {
    const { email } = req.body;
  
    const user = await userService.findByEmail(email);
    if (!user) {
        throw new NotFoundError('No user found with that email address');
    }

    // Generate a JWT reset token
    const token = generateResetToken(user.email);
    const resetLink = `${process.env.RESET_PASSWORD_URL}/${token}`;
    await sendResetPassword(email, resetLink);
  
    res.status(200).json({
        success: true,
        message: 'Password reset link sent to your email. The link will expire in 1 hour.'
    });
});

// Reset Password
export const resetPassword = asyncHandler(async (
    req: AuthenticatedRequest & ResetPassword, 
    res: Response<ApiResponse>,
    next: NextFunction
) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string; type?: string };
        // Verify token type if present
        if (decoded.type && decoded.type !== 'password_reset') {
            throw new UnauthorizedError('Invalid token type for password reset');
        }
        const user = await userService.findByEmail(decoded.email);
        if (!user) {
            throw new NotFoundError('User');
        }
        await userService.update(user.id, { password: newPassword });
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Password reset link has expired. Please request a new one.');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid reset token. Please request a new password reset link.');
        }
        throw error;
    }
});