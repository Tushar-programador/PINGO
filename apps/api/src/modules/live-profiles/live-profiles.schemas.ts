import { z } from 'zod';

export const goLiveSchema = z.object({
  vibe: z.enum(['CHILL', 'CURIOUS', 'FUNNY', 'TALKATIVE', 'SERIOUS', 'MEET_PEOPLE', 'LEARNING', 'OPEN']).optional(),
  intent: z.string().max(60).optional(),
});

export type GoLiveInput = z.infer<typeof goLiveSchema>;
