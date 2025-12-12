import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import type { ProofPayload } from "../schemas/proofSchema.js";
import {
  BlockfrostClient,
  createBlockfrostClient,
  fetchProtocolParameters,
  fetchWalletUtxos,
  submitTransaction,
} from "./cardano/blockfrost.js";
import { createProofOutput } from "./cardano/validator.js";
import {
  assertCardanoEnv,
  getPaymentAddress,
  getPrivateKey,
  resolveNetworkId,
} from "./cardano/wallet.js";
import {
  buildInputSet,
  buildTxConfig,
  finalizeTransaction,
} from "./cardano/transaction.js";

const MIN_PROOF_LOVELACE = 1_500_000n;

async function loadWalletContext(client: BlockfrostClient) {
  const networkId = resolveNetworkId();
  const privateKey = getPrivateKey();
  const paymentAddress = getPaymentAddress(privateKey, networkId);
  const paymentAddressBech32 = paymentAddress.to_bech32(undefined);
  const utxos = await fetchWalletUtxos(client, paymentAddressBech32);
  if (!utxos.length) {
    throw new Error("Signing wallet has no UTXOs available for spending");
  }

  return {
    networkId,
    privateKey,
    paymentAddress,
    utxoSet: buildInputSet(utxos),
  } as const;
}

export async function submitProofTransaction(payload: ProofPayload) {
  assertCardanoEnv();

  const client = createBlockfrostClient();
  const protocolParams = await fetchProtocolParameters(client);
  const txConfig = buildTxConfig(protocolParams);
  const txBuilder = Cardano.TransactionBuilder.new(txConfig);

  const { networkId, privateKey, paymentAddress, utxoSet } =
    await loadWalletContext(client);

  txBuilder.add_inputs_from(
    utxoSet,
    Cardano.CoinSelectionStrategyCIP2.LargestFirst
  );
  txBuilder.add_output(
    createProofOutput(networkId, payload.applicantHash, MIN_PROOF_LOVELACE)
  );
  txBuilder.add_change_if_needed(paymentAddress);

  const { transaction, txHash } = finalizeTransaction(txBuilder, privateKey);
  await submitTransaction(client, transaction.to_bytes());

  return Buffer.from(txHash.to_bytes()).toString("hex");
}
