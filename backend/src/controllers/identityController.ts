import type { Request, Response } from "express";
import { z } from "zod";
import { onboardingSchema } from "../schemas/onboardingSchema.js";
import { enqueueVerificationJob } from "../services/queueService.js";
import { persistApplicant } from "../services/identityService.js";
import {
  fetchNinDetails,
  MonnifyConfigurationError,
  MonnifyLookupError,
} from "../services/monnifyService.js";
import { logger } from "../lib/logger.js";

export async function createIdentity(req: Request, res: Response) {
  const parsed = onboardingSchema.parse(req.body);
  const applicant = await persistApplicant(parsed);
  await enqueueVerificationJob(applicant.id);

  return res
    .status(201)
    .json({
      userId: applicant.id,
      estimatedCompletion: applicant.estimatedCompletion,
    });
}

const ninParamsSchema = z.object({
  nin: z
    .string()
    .trim()
    .regex(/^[0-9]{11}$/),
});

export async function getUtxos(req: Request, res: Response) {
  // Placeholder implementation for UTXO retrieval
  
}


export async function getNinRecord(req: Request, res: Response) {
  const parsed = ninParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ message: "A valid 11-digit NIN is required" });
  }

  try {
    const record = await fetchNinDetails(parsed.data.nin);
    return res.json(record);
  } catch (error) {
    if (error instanceof MonnifyConfigurationError) {
      return res.status(503).json({ message: error.message });
    }

    if (error instanceof MonnifyLookupError) {
      return res.status(error.status).json({ message: error.message });
    }

    logger.error({ err: error }, "Unexpected error while fetching NIN record");
    return res.status(500).json({ message: "Unable to retrieve NIN record" });
  }
}
