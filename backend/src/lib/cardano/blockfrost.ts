import axios from "axios";
import { env } from "../../config/env.js";

export interface BlockfrostAmount {
  unit: string;
  quantity: string;
}

export interface BlockfrostUtxo {
  tx_hash: string;
  output_index: number;
  amount: BlockfrostAmount[];
  address: string;
  data_hash?: string | null;
  inline_datum?: string | null;
}

export interface BlockfrostProtocolParameters {
  min_fee_a: string | number;
  min_fee_b: string | number;
  key_deposit: string;
  pool_deposit: string;
  max_tx_size: number | string;
  max_value_size: number | string;
  coins_per_utxo_size: string;
  ada_per_utxo_byte?: string;
  price_mem: string | number;
  price_step: string | number;
}

export type BlockfrostClient = ReturnType<typeof axios.create>;

export function createBlockfrostClient(): BlockfrostClient {
  const baseURL = (env.BLOCKFROST_API_URL ?? "").replace(/\/$/, "");
  return axios.create({
    baseURL,
    headers: {
      project_id: env.BLOCKFROST_PROJECT_ID!,
    },
    timeout: Number.isFinite(env.BLOCKFROST_TIMEOUT_MS)
      ? env.BLOCKFROST_TIMEOUT_MS
      : 60_000,
  });
}

export async function fetchProtocolParameters(
  client: BlockfrostClient
): Promise<BlockfrostProtocolParameters> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.get("/epochs/latest/parameters");
      return response.data as BlockfrostProtocolParameters;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      const status = error?.response?.status;
      const isTransientError =
        error.code === "ECONNABORTED" ||
        error.code === "ECONNRESET" ||
        error.code === "ENOTFOUND" ||
        error.code === "ETIMEDOUT" ||
        status === 408 ||
        status === 429 ||
        status >= 500;

      if (!isTransientError || isLastAttempt) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `Blockfrost request failed (attempt ${
          attempt + 1
        }/${maxRetries}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Failed to fetch protocol parameters after retries");
}

export async function fetchWalletUtxos(
  client: BlockfrostClient,
  address: string
) {
  const response = await client.get(`/addresses/${address}/utxos`, {
    params: { order: "desc" },
  });
  return response.data as BlockfrostUtxo[];
}

export async function submitTransaction(
  client: BlockfrostClient,
  txBytes: Uint8Array
) {
  await client.post("/tx/submit", Buffer.from(txBytes), {
    headers: { "Content-Type": "application/cbor" },
    responseType: "text",
  });
}
