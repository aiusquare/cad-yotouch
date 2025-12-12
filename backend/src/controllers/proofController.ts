import type { NextFunction, Request, Response } from "express";
import { proofSchema } from "../schemas/proofSchema.js";
import { submitIdentityProof } from "../services/proofService.js";

export async function handleProofSubmission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const payload = proofSchema.parse(req.body);
    const txHash = await submitIdentityProof(payload);
    return res.status(201).json({ txHash });
  } catch (error) {
    next(error);
  }
}
