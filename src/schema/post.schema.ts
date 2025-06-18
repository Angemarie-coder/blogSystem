import { z } from 'zod';
import { titleSchema, bodySchema } from './common.schemas';

// Schema for media object
const mediaSchema = z.object({
  type: z.enum(['image', 'video', 'document']),
  url: z.string().url('Invalid URL')
}).nullable();

// Schema for creating a new post
export const createPostSchema = z.object({
  body: z.object({
    title: titleSchema,
    body: bodySchema,
    category: z.enum(['Tech', 'Development','Trends']),
    status: z.enum(['draft', 'posted']),
    media: mediaSchema
  })
});

// Schema for getting all posts with pagination
export const getPostsSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10')
  })
});

// Schema for getting a single post by ID
export const getPostByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Post ID is required')
  })
});

// Schema for updating a post
export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Post ID is required')
  }),
  body: z.object({
    title: titleSchema.optional(),
    body: bodySchema.optional(),
    category: z.enum(['Tech', 'Development']).optional(),
    status: z.enum(['draft', 'posted']).optional(),
    media: mediaSchema.optional()
  }).refine(data => data.title || data.body || data.category || data.status || data.media, {
    message: 'At least one field must be provided',
    path: ['body']
  })
});

// Schema for deleting a post
export const deletePostSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Post ID is required')
  })
});

// TypeScript types for the schemas
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type SearchPostsInput = z.infer<typeof getPostsSchema>;
export type GetPostByIdInput = z.infer<typeof getPostByIdSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;