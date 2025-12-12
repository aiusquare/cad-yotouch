import { Router } from "express";
import { onboardingRouter } from "./onboarding.js";
import { proofRouter } from "./proofs.js";
import { badgesRouter } from "./badges.js";
import { walletRouter } from "./wallet.js";

export const router = Router();

router.use("/identities", onboardingRouter);
router.use("/proofs", proofRouter);
router.use("/badges", badgesRouter);
router.use("/wallet", walletRouter);
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// TEST: Direct POST endpoint
router.post("/test-mint", (_req, res) => {
  res.json({ test: "mint works directly" });
});
