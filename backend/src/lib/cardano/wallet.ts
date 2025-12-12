import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import { env } from "../../config/env.js";

export function assertCardanoEnv() {
  if (!env.BLOCKFROST_PROJECT_ID) {
    throw new Error("BLOCKFROST_PROJECT_ID is not configured");
  }
  if (!env.CARDANO_SIGNING_KEY) {
    throw new Error("CARDANO_SIGNING_KEY is not configured");
  }
}

export function resolveNetworkId() {
  return env.CARDANO_NETWORK?.toLowerCase() === "mainnet" ? 1 : 0;
}

export function getPrivateKey() {
  return Cardano.PrivateKey.from_bech32(env.CARDANO_SIGNING_KEY!);
}

export function getPaymentAddress(
  privateKey: Cardano.PrivateKey,
  networkId: number
) {
  const paymentKeyHash = privateKey.to_public().hash();
  const paymentCredential =
    Cardano.StakeCredential.from_keyhash(paymentKeyHash);
  return Cardano.EnterpriseAddress.new(
    networkId,
    paymentCredential
  ).to_address();
}
