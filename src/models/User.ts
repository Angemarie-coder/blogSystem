import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Post } from './Post';
import { PasswordResetToken } from './PasswordResetToken';

export type UserRole = 'user' | 'admin' | 'superuser';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100, nullable: true, unique: true })
  email!: string;

  @Column({ type: 'enum', enum: ['user', 'admin', 'superuser'], default: 'user' })
  role!: UserRole;

  @Column({ length: 255 })
  password!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Post[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens!: PasswordResetToken[];

  @Column({ nullable: true })
  profileImage?: string;
}
