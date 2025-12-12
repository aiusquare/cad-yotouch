import { Router } from "express";
import {
	createIdentity,
	getNinRecord,
} from "../controllers/identityController.js";

export const onboardingRouter = Router();

onboardingRouter.post("/", createIdentity);
onboardingRouter.get("/nin/:nin", getNinRecord);
