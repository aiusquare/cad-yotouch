import { Lucid, Blockfrost } from "lucid-cardano";
import validator from "../../aiken-build/plutus.json";

interface CompiledValidator {
  cbor: string;
}

const compiledValidator = validator as CompiledValidator;

export async function getLucidInstance(blockfrostKey: string): Promise<Lucid> {
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preprod.blockfrost.io/api/v0",
      blockfrostKey
    ),
    "Preprod"
  );

  return lucid;
}

export function getValidatorScript(): string {
  return compiledValidator.cbor;
}

// Detect and connect wallet
export async function connectWallet(lucid: Lucid): Promise<string> {
  // Check which wallets are available
  const cardano = window.cardano;

  // Try Nami first
  if (cardano?.nami) {
    const api = await cardano.nami.enable();
    lucid.selectWallet(api);

    console.log("Connected to Nami wallet");
    return "nami";
  }

  // Try Eternl
  if (cardano?.eternl) {
    const api = await cardano.eternl.enable();
    lucid.selectWallet(api);

    console.log("Connected to Eternl wallet");
    return "eternl";
  }

  // Try Flint
  if (cardano?.flint) {
    const api = await cardano.flint.enable();
    lucid.selectWallet(api);

    console.log("Connected to Flint wallet");
    return "flint";
  }

  throw new Error("No wallet found");
}

// Get wallet info
async function getWalletInfo(lucid: Lucid) {
  const address = await lucid.wallet.address();
  const utxos = await lucid.wallet.getUtxos();
  const balance = await lucid.wallet.getBalance();

  return {
    address,
    balance: balance / 1000000n, // Convert lovelace to ADA
    utxos: utxos.length,
  };
}
