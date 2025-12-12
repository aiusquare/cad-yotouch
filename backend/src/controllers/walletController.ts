import type { Request, Response } from "express";
import {
  createBlockfrostClient,
  fetchWalletUtxos,
} from "../lib/cardano/blockfrost.js";
import {
  getPaymentAddress,
  getPrivateKey,
  resolveNetworkId,
} from "../lib/cardano/wallet.js";
import { logger } from "../lib/logger.js";

export async function getWalletUtxoCount(_req: Request, res: Response) {
  try {
    // Get the backend wallet address
    const privateKey = getPrivateKey();
    const networkId = resolveNetworkId();
    const paymentAddress = getPaymentAddress(privateKey, networkId);
    const paymentAddressBech32 = paymentAddress.to_bech32(undefined);

    logger.info(`Fetching UTXOs for wallet address: ${paymentAddressBech32}`);

    // Fetch UTXOs from Blockfrost
    const client = createBlockfrostClient();
    const utxos = await fetchWalletUtxos(client, paymentAddressBech32);

    logger.info(`Found ${utxos.length} UTXOs for backend wallet`);

    res.json({
      success: true,
      utxoCount: utxos.length,
      address: paymentAddressBech32,
      utxos: utxos.map((u) => ({
        txHash: u.tx_hash,
        outputIndex: u.output_index,
        lovelace: u.amount[0]?.quantity || "0",
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching wallet UTXOs");
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch UTXOs",
    });
  }
}

export async function getWalletBalance(_req: Request, res: Response) {
  try {
    // Get the backend wallet address
    const privateKey = getPrivateKey();
    const networkId = resolveNetworkId();
    const paymentAddress = getPaymentAddress(privateKey, networkId);
    const paymentAddressBech32 = paymentAddress.to_bech32(undefined);

    logger.info(`Fetching wallet balance for address: ${paymentAddressBech32}`);

    // Fetch UTXOs from Blockfrost
    const client = createBlockfrostClient();
    const utxos = await fetchWalletUtxos(client, paymentAddressBech32);

    // Calculate total lovelace balance
    const totalLovelace = utxos.reduce((sum, utxo) => {
      const adaAmount = utxo.amount[0]?.quantity || "0";
      return sum + BigInt(adaAmount);
    }, 0n);

    // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
    const totalAda = Number(totalLovelace) / 1_000_000;

    logger.info(`Wallet balance: ${totalAda} ADA (${totalLovelace} lovelace)`);

    res.json({
      success: true,
      address: paymentAddressBech32,
      balanceLovelace: totalLovelace.toString(),
      balanceAda: totalAda,
      utxoCount: utxos.length,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching wallet balance");
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch wallet balance",
    });
  }
}
