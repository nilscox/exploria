import z from 'zod';

export const summarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  biases: z.array(z.object({ name: z.string(), explanation: z.string() })),
  blindSpots: z.array(z.string()),
  tensions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  conclusion: z.string().nullable(),
});

export type Summary = z.infer<typeof summarySchema>;
