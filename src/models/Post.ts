import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './User';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  title!: string;

  @Column('text')
  body!: string;

  @Column({
    type: 'enum',
    enum: ['Tech', 'Development', 'Trends'],
    default: 'Tech'
  })
  category!: string;

  @Column({
    type: 'enum',
    enum: ['posted', 'draft'],
    default: 'posted'
  })
  status!: string;

  @Column('json', { nullable: true })
  media?: {
    type: 'image' | 'video' | 'document';
    url: string;
  } | null;

  @ManyToOne(() => User, (user) => user.posts, { eager: true })
  author!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'int', default: 0 })
  likes!: number;

  @Column({ type: 'int', default: 0 })
  comments!: number;
}
