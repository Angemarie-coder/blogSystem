import express, { Router } from 'express';
import { 
  register, 
  verifyEmail, 
  login, 
  forgotPassword, 
  resetPassword,
  privateRegister,
  superRegister
} from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';

import { 
  signupSchema, 
  verifyEmailSchema,
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../schema/auth.schemas';


const router = express.Router();

router.post('/register', validate(signupSchema), register);
router.post('/verify-email/:token', validate(verifyEmailSchema), verifyEmail);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.post('/private', validate(signupSchema), privateRegister);
router.post('/sprivate', validate(signupSchema), superRegister);

export default router;