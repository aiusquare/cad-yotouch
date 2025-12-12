import { Router } from "express";
import { handleProofSubmission } from "../controllers/proofController.js";

export const proofRouter = Router();

proofRouter.post("/", handleProofSubmission);
