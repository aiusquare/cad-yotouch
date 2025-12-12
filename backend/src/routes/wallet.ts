import { Router } from "express";
import {
  getWalletUtxoCount,
  getWalletBalance,
} from "../controllers/walletController.js";

export const walletRouter = Router();

walletRouter.get("/utxo-count", getWalletUtxoCount);
walletRouter.get("/balance", getWalletBalance);
