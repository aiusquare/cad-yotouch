import { createBlockfrostClient } from "../dist/lib/cardano/blockfrost.js";
import {
  getPaymentAddress,
  getPrivateKey,
  resolveNetworkId,
} from "../dist/lib/cardano/wallet.js";

const tx = process.argv[2];
if (!tx) {
  console.error("Usage: node scripts/debugTx.mjs <txHash>");
  process.exit(1);
}

const client = createBlockfrostClient();
const networkId = resolveNetworkId();
const walletAddr = getPaymentAddress(getPrivateKey(), networkId).to_bech32();

const txInfo = (await client.get(`/txs/${tx}`)).data;
const txUtxos = (await client.get(`/txs/${tx}/utxos`)).data;
const walletUtxos = (
  await client.get(`/addresses/${walletAddr}/utxos`, {
    params: { order: "desc" },
  })
).data;

const outputs = txUtxos.outputs ?? [];
const outputsToWallet = outputs.filter((o) => o.address === walletAddr);
const outputAddresses = [...new Set(outputs.map((o) => o.address))].slice(
  0,
  25
);
const walletStillHasTx = walletUtxos.some((u) => u.tx_hash === tx);

console.log(
  JSON.stringify(
    {
      walletAddr,
      tx: {
        hash: tx,
        block_height: txInfo.block_height,
        block_time: txInfo.block_time,
        confirmations: txInfo.confirmations,
      },
      txUtxo: {
        inputs: (txUtxos.inputs ?? []).length,
        outputs: outputs.length,
        outputsToWallet: outputsToWallet.length,
        outputAddresses,
      },
      wallet: {
        currentUtxos: walletUtxos.length,
        includesThisTx: walletStillHasTx,
      },
    },
    null,
    2
  )
);
