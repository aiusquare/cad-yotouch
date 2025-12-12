import { z } from "zod";

export const proofSchema = z.object({
  applicantHash: z.string().min(10),
  score: z.number().int().min(0).max(100),
  reviewerSignatures: z.array(z.string()).default([]),
});

export type ProofPayload = z.infer<typeof proofSchema>;
