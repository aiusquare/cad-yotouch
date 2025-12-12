import { promises as fs } from "node:fs";
import path from "node:path";
import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export interface SigningWalletArtifacts {
  privateKeyPath: string;
  publicKeyPath: string;
  addressPath: string;
  address: string;
  network: string;
}

function resolveNetworkId(networkName?: string) {
  return networkName?.toLowerCase() === "mainnet" ? 1 : 0;
}

function sanitizeFileNameSegment(segment: string) {
  return segment.replace(/[^a-z0-9-]/gi, "-");
}

export async function createSigningWallet(
  outputDir?: string
): Promise<SigningWalletArtifacts> {
  const walletDir =
    outputDir ?? path.resolve(process.cwd(), "generated-wallet");
  const network = env.CARDANO_NETWORK ?? "Preprod";
  const timestamp = sanitizeFileNameSegment(new Date().toISOString());

  const privateKey = Cardano.PrivateKey.generate_ed25519();
  const privateKeyBech32 = privateKey.to_bech32();
  const publicKey = privateKey.to_public();
  const publicKeyHex = (publicKey as unknown as { to_hex(): string }).to_hex();
  const keyHash = privateKey.to_public().hash();

  const networkId = resolveNetworkId(network);
  const enterpriseAddress = Cardano.EnterpriseAddress.new(
    networkId,
    Cardano.StakeCredential.from_keyhash(keyHash)
  )
    .to_address()
    .to_bech32(undefined);

  await fs.mkdir(walletDir, { recursive: true });

  const privateKeyPath = path.join(walletDir, `signing-key-${timestamp}.txt`);
  const publicKeyPath = path.join(
    walletDir,
    `verification-key-${timestamp}.txt`
  );
  const addressPath = path.join(walletDir, `address-${timestamp}.txt`);

  const files = [
    fs.writeFile(
      privateKeyPath,
      [
        "# YoTouch Signing Key",
        `network=${network}`,
        `bech32=${privateKeyBech32}`,
      ].join("\n") + "\n",
      { encoding: "utf-8" }
    ),
    fs.writeFile(
      publicKeyPath,
      [
        "# YoTouch Verification Key",
        `network=${network}`,
        `hex=${publicKeyHex}`,
      ].join("\n") + "\n",
      { encoding: "utf-8" }
    ),
    fs.writeFile(
      addressPath,
      [
        "# YoTouch Enterprise Address",
        `network=${network}`,
        `address=${enterpriseAddress}`,
      ].join("\n") + "\n",
      { encoding: "utf-8" }
    ),
  ];

  await Promise.all(files);

  logger.info(
    { privateKeyPath, publicKeyPath, addressPath, network },
    "Generated Cardano signing wallet artifacts"
  );

  return {
    privateKeyPath,
    publicKeyPath,
    addressPath,
    address: enterpriseAddress,
    network,
  };
}
