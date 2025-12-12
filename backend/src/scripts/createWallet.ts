import { promises as fs } from "fs";
import path from "node:path";
import { createSigningWallet } from "../services/walletService.js";

async function main() {
  const [customDir] = process.argv.slice(2);
  const outputDir = customDir
    ? path.resolve(process.cwd(), customDir)
    : undefined;

  const artifacts = await createSigningWallet(outputDir);
  const [privateKeyRaw, publicKeyRaw, addressRaw] = await Promise.all([
    fs.readFile(artifacts.privateKeyPath, "utf-8"),
    fs.readFile(artifacts.publicKeyPath, "utf-8"),
    fs.readFile(artifacts.addressPath, "utf-8"),
  ]);

  console.log("\n✅ Wallet created:");
  console.log(`Network: ${artifacts.network}`);
  console.log(`Address: ${artifacts.address}`);
  console.log("");
  console.log("Signing key file:", artifacts.privateKeyPath);
  console.log(privateKeyRaw.trim());
  console.log("");
  console.log("Verification key file:", artifacts.publicKeyPath);
  console.log(publicKeyRaw.trim());
  console.log("");
  console.log("Address file:", artifacts.addressPath);
  console.log(addressRaw.trim());
}

main().catch((error) => {
  console.error("Wallet creation failed", error);
  process.exit(1);
});
