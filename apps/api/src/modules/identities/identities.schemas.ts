import { z } from 'zod';

export const createIdentitySchema = z.object({
  displayName: z.string().min(1).max(40),
  avatarUrl: z.string().url(),
  intro: z.string().max(280).optional(),
  interests: z.array(z.string().min(1).max(30)).max(10).optional(),
  language: z.string().min(2).max(10).optional(),
});

export type CreateIdentityInput = z.infer<typeof createIdentitySchema>;
