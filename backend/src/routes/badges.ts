import { Router } from "express";
import { handleMintBadge } from "../controllers/badgeController.js";

export const badgesRouter = Router();

// POST /api/badges/mint
badgesRouter.post("/mint", handleMintBadge);

export default badgesRouter;
