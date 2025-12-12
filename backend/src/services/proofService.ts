import type { ProofPayload } from "../schemas/proofSchema.js";
import { logger } from "../lib/logger.js";
import { submitProofTransaction } from "../lib/cardanoProof.js";

export async function submitIdentityProof(payload: ProofPayload) {
  const txHash = await submitProofTransaction(payload);
  logger.info({ txHash }, "Submitted identity proof");
  return txHash;
}
