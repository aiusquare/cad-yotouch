import { promises as fs } from "node:fs";
import path from "node:path";
import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import { Lucid, Data, Constr } from "@lucid-evolution/lucid";
import { Blockfrost } from "@lucid-evolution/provider";
import {
  mintingPolicyToId,
  toUnit,
  validatorToAddress,
} from "@lucid-evolution/utils";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

type Blueprint = {
  preamble?: { plutusVersion?: string };
  validators?: Array<{ title?: string; compiledCode?: string; hash?: string }>;
};

type Script = {
  type: "PlutusV3";
  script: string;
};

let blueprintPromise: Promise<Blueprint> | null = null;
let lucidPromise: Promise<Awaited<ReturnType<typeof Lucid>>> | null = null;

function assertBlockchainEnv() {
  if (!env.BLOCKFROST_PROJECT_ID) {
    throw new Error("BLOCKFROST_PROJECT_ID is not configured");
  }
  if (!env.CARDANO_SIGNING_KEY) {
    throw new Error("CARDANO_SIGNING_KEY is not configured");
  }
}

function normalizeHex(input: string) {
  return input.trim().replace(/^0x/i, "").toLowerCase();
}

function isHex(input: string) {
  return /^[0-9a-f]+$/i.test(input);
}

function requireHexBytes(
  input: string,
  expectedLengthBytes: number,
  name: string
) {
  const cleaned = normalizeHex(input);
  if (!isHex(cleaned) || cleaned.length !== expectedLengthBytes * 2) {
    throw new Error(
      `${name} must be ${expectedLengthBytes} bytes hex (length ${
        expectedLengthBytes * 2
      }), got '${input}'`
    );
  }
  return cleaned;
}

function getBackendPaymentKeyHashHex() {
  const privateKey = Cardano.PrivateKey.from_bech32(env.CARDANO_SIGNING_KEY!);
  const publicKey = privateKey.to_public();
  const keyHash = publicKey.hash();
  // @emurgo CSL exposes either to_hex() or to_bytes(); handle both.
  const keyHashAny = keyHash as unknown as {
    to_hex?: () => string;
    to_bytes?: () => Uint8Array;
  };
  if (typeof keyHashAny.to_hex === "function") {
    return keyHashAny.to_hex().toLowerCase();
  }
  if (typeof keyHashAny.to_bytes === "function") {
    return Buffer.from(keyHashAny.to_bytes()).toString("hex").toLowerCase();
  }
  throw new Error("Unable to derive payment key hash from CARDANO_SIGNING_KEY");
}

async function loadBlueprint(): Promise<Blueprint> {
  if (!blueprintPromise) {
    blueprintPromise = (async () => {
      const projectRoot = process.cwd();
      const bundlePath = path.join(
        projectRoot,
        "..",
        "cardano-contract",
        "plutus.json"
      );
      const raw = await fs.readFile(bundlePath, "utf-8");
      return JSON.parse(raw) as Blueprint;
    })();
  }
  return blueprintPromise;
}

async function getLucid() {
  if (!lucidPromise) {
    assertBlockchainEnv();
    lucidPromise = (async () => {
      const provider = new Blockfrost(
        env.BLOCKFROST_API_URL,
        env.BLOCKFROST_PROJECT_ID!
      );
      const lucid = await Lucid(provider, env.CARDANO_NETWORK as any);
      lucid.selectWallet.fromPrivateKey(env.CARDANO_SIGNING_KEY!);
      return lucid;
    })();
  }
  return lucidPromise;
}

function findScript(blueprint: Blueprint, title: string): Script {
  const found = blueprint.validators?.find((v) => v?.title === title);
  if (!found?.compiledCode) {
    throw new Error(
      `Compiled script not found in cardano-contract/plutus.json: ${title}`
    );
  }
  return { type: "PlutusV3", script: found.compiledCode };
}

function makeBadgeAssetName(ownerVkhHex: string, level: number): string {
  // IMPORTANT: Cardano asset names are limited to 32 bytes.
  // On-chain (Aiken) format is a compact 30-byte name:
  //   0x59 ('Y') || level_u8 || owner_vkh(28 bytes)
  // Where `level` is expected to be in [0..4].
  const cleaned = requireHexBytes(ownerVkhHex, 28, "ownerVkhHex");
  if (!Number.isInteger(level) || level < 0 || level > 255) {
    throw new Error(`level must fit in 1 byte (0..255), got '${level}'`);
  }
  const levelHex = level.toString(16).padStart(2, "0");
  return `59${levelHex}${cleaned}`;
}

function encodeBadgeDatum(
  ownerKeyHashHex: string,
  level: number,
  policyId: string
) {
  // Aiken record `BadgeDatum { owner, level, policy_id }` => Constr 0 [owner, level, policy_id]
  return Data.to(new Constr(0, [ownerKeyHashHex, BigInt(level), policyId]));
}

function encodeBadgeMintRedeemer(
  action: "Init" | "Upgrade" | "Retire",
  ownerKeyHashHex: string,
  args: { level?: number; fromLevel?: number; toLevel?: number }
) {
  // Aiken enum:
  // 0: Init { owner, level }
  // 1: Upgrade { owner, from_level, to_level }
  // 2: Retire { owner, level }
  if (action === "Init") {
    if (args.level === undefined)
      throw new Error("Missing level for Init redeemer");
    return Data.to(new Constr(0, [ownerKeyHashHex, BigInt(args.level)]));
  }
  if (action === "Upgrade") {
    if (args.fromLevel === undefined || args.toLevel === undefined) {
      throw new Error("Missing fromLevel/toLevel for Upgrade redeemer");
    }
    return Data.to(
      new Constr(1, [
        ownerKeyHashHex,
        BigInt(args.fromLevel),
        BigInt(args.toLevel),
      ])
    );
  }
  if (args.level === undefined)
    throw new Error("Missing level for Retire redeemer");
  return Data.to(new Constr(2, [ownerKeyHashHex, BigInt(args.level)]));
}

function encodeBadgeHolderRedeemer(
  action: "Upgrade" | "Retire",
  newLevel?: number
) {
  // Aiken enum:
  // 0: Upgrade { new_level }
  // 1: Retire
  if (action === "Upgrade") {
    if (newLevel === undefined)
      throw new Error("Missing newLevel for badge-holder Upgrade");
    return Data.to(new Constr(0, [BigInt(newLevel)]));
  }
  return Data.to(new Constr(1, []));
}

export async function mintBadge({
  ownerVkhHex,
  level,
  action = "Init",
}: {
  ownerVkhHex?: string;
  level: number;
  action?: "Init" | "Upgrade" | "Retire";
}) {
  // Custodial mode: always use the backend signing key as the badge owner.
  const ownerKeyHashHex = getBackendPaymentKeyHashHex();
  if (ownerVkhHex) {
    try {
      const requested = requireHexBytes(ownerVkhHex, 28, "ownerVkhHex");
      if (requested !== ownerKeyHashHex) {
        logger.warn(
          { requestedOwnerVkhHex: requested, ownerKeyHashHex },
          "Ignoring provided ownerVkhHex; using server signing key"
        );
      }
    } catch (error) {
      logger.warn(
        { ownerVkhHex, error: String(error) },
        "Invalid ownerVkhHex provided; using server signing key"
      );
    }
  }

  logger.info({ ownerKeyHashHex, level, action }, "mintBadge called");

  const blueprint = await loadBlueprint();
  if (blueprint?.preamble?.plutusVersion !== "v3") {
    throw new Error(
      `Expected Plutus V3 blueprint at cardano-contract/plutus.json, got ${String(
        blueprint?.preamble?.plutusVersion
      )}`
    );
  }

  const badgeMintPolicy = findScript(blueprint, "badge_mint.badge_mint.mint");
  const badgeHolderValidator = findScript(
    blueprint,
    "badge_holder.badge_holder.spend"
  );

  const lucid = await getLucid();
  const policyId = mintingPolicyToId(badgeMintPolicy as any);
  const assetNameHex = makeBadgeAssetName(ownerKeyHashHex, level);
  const unit = toUnit(policyId, assetNameHex);
  const badgeHolderAddress = validatorToAddress(
    env.CARDANO_NETWORK as any,
    badgeHolderValidator as any
  );

  const badgeDatumCbor = encodeBadgeDatum(ownerKeyHashHex, level, policyId);

  try {
    if (action === "Init") {
      const mintRedeemer = encodeBadgeMintRedeemer("Init", ownerKeyHashHex, {
        level,
      });
      const inlineDatum = badgeDatumCbor;

      const tx = await lucid
        .newTx()
        .attach.MintingPolicy(badgeMintPolicy as any)
        .addSignerKey(ownerKeyHashHex as any)
        .mintAssets({ [unit]: 1n }, mintRedeemer)
        .pay.ToContract(
          badgeHolderAddress,
          { kind: "inline", value: inlineDatum },
          { lovelace: 2_000_000n, [unit]: 1n }
        )
        .complete();

      const signed = await tx.sign.withWallet().complete();
      const txHash = await signed.submit();
      return {
        success: true,
        action,
        level,
        ownerVkhHex: ownerKeyHashHex,
        assetNameHex,
        assetName: Buffer.from(assetNameHex, "hex").toString("utf8"),
        policyId,
        unit,
        badgeHolderAddress,
        txHash,
        message: "Badge minted and locked at badge-holder script",
      };
    }

    if (action === "Upgrade") {
      const fromLevel = level - 1;
      const toLevel = level;
      if (fromLevel < 0) {
        throw new Error("Upgrade requires `level` >= 1 (target new level)");
      }

      const fromAssetNameHex = makeBadgeAssetName(ownerKeyHashHex, fromLevel);
      const fromUnit = toUnit(policyId, fromAssetNameHex);
      const toAssetNameHex = makeBadgeAssetName(ownerKeyHashHex, toLevel);
      const toUnitValue = toUnit(policyId, toAssetNameHex);

      const scriptUtxos = await lucid.utxosAtWithUnit(
        badgeHolderAddress,
        fromUnit
      );
      const targetUtxo = scriptUtxos[0];
      if (!targetUtxo) {
        throw new Error(
          `No badge-holder UTxO found for level ${fromLevel} at ${badgeHolderAddress}`
        );
      }

      const mintRedeemer = encodeBadgeMintRedeemer("Upgrade", ownerKeyHashHex, {
        fromLevel,
        toLevel,
      });
      const spendRedeemer = encodeBadgeHolderRedeemer("Upgrade", toLevel);
      const inlineDatum = encodeBadgeDatum(ownerKeyHashHex, toLevel, policyId);

      const tx = await lucid
        .newTx()
        .attach.MintingPolicy(badgeMintPolicy as any)
        .attach.SpendingValidator(badgeHolderValidator as any)
        .addSignerKey(ownerKeyHashHex as any)
        .collectFrom([targetUtxo], spendRedeemer)
        .mintAssets({ [fromUnit]: -1n, [toUnitValue]: 1n }, mintRedeemer)
        .pay.ToContract(
          badgeHolderAddress,
          { kind: "inline", value: inlineDatum },
          { lovelace: 2_000_000n, [toUnitValue]: 1n }
        )
        .complete();

      const signed = await tx.sign.withWallet().complete();
      const txHash = await signed.submit();
      return {
        success: true,
        action,
        level: toLevel,
        ownerVkhHex: ownerKeyHashHex,
        policyId,
        fromUnit,
        toUnit: toUnitValue,
        badgeHolderAddress,
        txHash,
        message: "Badge upgraded",
      };
    }

    if (action === "Retire") {
      const assetNameHexRetire = makeBadgeAssetName(ownerKeyHashHex, level);
      const unitRetire = toUnit(policyId, assetNameHexRetire);

      const scriptUtxos = await lucid.utxosAtWithUnit(
        badgeHolderAddress,
        unitRetire
      );
      const targetUtxo = scriptUtxos[0];
      if (!targetUtxo) {
        throw new Error(
          `No badge-holder UTxO found for level ${level} at ${badgeHolderAddress}`
        );
      }

      const mintRedeemer = encodeBadgeMintRedeemer("Retire", ownerKeyHashHex, {
        level,
      });
      const spendRedeemer = encodeBadgeHolderRedeemer("Retire");

      const tx = await lucid
        .newTx()
        .attach.MintingPolicy(badgeMintPolicy as any)
        .attach.SpendingValidator(badgeHolderValidator as any)
        .addSignerKey(ownerKeyHashHex as any)
        .collectFrom([targetUtxo], spendRedeemer)
        .mintAssets({ [unitRetire]: -1n }, mintRedeemer)
        .complete();

      const signed = await tx.sign.withWallet().complete();
      const txHash = await signed.submit();
      return {
        success: true,
        action,
        level,
        ownerVkhHex: ownerKeyHashHex,
        policyId,
        unit: unitRetire,
        badgeHolderAddress,
        txHash,
        message: "Badge retired (burned)",
      };
    }

    throw new Error(`Unsupported action: ${String(action)}`);
  } catch (error) {
    logger.error(error, "Badge mint failed");
    throw error;
  }
}

export default {
  mintBadge,
};
