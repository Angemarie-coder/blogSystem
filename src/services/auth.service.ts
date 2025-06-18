import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private resetTokenRepository = AppDataSource.getRepository(PasswordResetToken);

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.password) {
      throw new Error("Password is required");
    }
    // Store email as lowercase
    if (userData.email) {
      userData.email = userData.email.toLowerCase();
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    userData.password = hashedPassword;
    // Create and save user
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async login(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ email: email.toLowerCase() });
    if (!user) return null;
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return null;
    return user;
  }

  async createPasswordResetToken(user: User): Promise<PasswordResetToken> {
    // Invalidate previous tokens for this user
    await this.resetTokenRepository.delete({ user: { id: user.id } });
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const resetToken = this.resetTokenRepository.create({ user, token, expiresAt });
    return await this.resetTokenRepository.save(resetToken);
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    return await this.resetTokenRepository.findOne({ where: { token }, relations: ['user'] });
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.resetTokenRepository.delete({ token });
  }
}