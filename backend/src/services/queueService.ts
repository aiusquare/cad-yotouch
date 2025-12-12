import { logger } from "../lib/logger.js";

export async function enqueueVerificationJob(applicantId: string) {
  // Placeholder for BullMQ/Temporal integration
  logger.info({ applicantId }, "Enqueued verification job");
}
