import type { Request, Response, NextFunction } from "express";
import { mintBadge } from "../services/badgeService.js";
import { logger } from "../lib/logger.js";

export async function handleMintBadge(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("🔷 handleMintBadge called with body:", req.body);
    const userId = (req as any).user?.sub || "test-user"; // From Supabase JWT middleware or test user
    const { level, action } = req.body;

    if (typeof level !== "number") {
      return res
        .status(400)
        .json({ error: "level (number) is required in request body" });
    }

    logger.info({ userId, level, action }, "Badge mint requested");

    // Custodial mode: the backend uses its own signing key; any provided ownerVkhHex is ignored.
    const ownerVkhHex = (req.body as any).ownerVkhHex;
    const result = await mintBadge({ ownerVkhHex, level, action });

    logger.info(
      { userId, txHash: (result as any).txHash },
      "Badge mint completed"
    );
    return res.status(201).json(result);
  } catch (err) {
    logger.error(err, "Badge mint failed");
    next(err);
  }
}
