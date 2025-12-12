import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import validatorBundle from "../../../../new_frontend/aiken-build/plutus.json" with { type: "json" };

const compiledValidatorHex = (() => {
  const validators = (validatorBundle as any)?.validators ?? [];
  const identityValidator = validators.find((entry: any) =>
    typeof entry?.title === "string" && entry.title.includes("identity_validator")
  );

  if (!identityValidator?.compiledCode) {
    throw new Error("Identity validator compiled code not found in plutus.json");
  }

  return identityValidator.compiledCode as string;
})();

const validatorScript = Cardano.PlutusScript.from_bytes(Buffer.from(compiledValidatorHex, "hex"));
const validatorHash = validatorScript.hash();

export function getValidatorScript() {
  return validatorScript;
}

export function getValidatorHash() {
  return validatorHash;
}

function createInlineDatum(applicantHash: string) {
  const normalized = applicantHash.startsWith("0x") ? applicantHash.slice(2) : applicantHash;
  const isHex = /^[0-9a-fA-F]+$/.test(normalized);
  const bytes = isHex ? Buffer.from(normalized, "hex") : Buffer.from(applicantHash, "utf-8");
  return Cardano.PlutusData.new_bytes(bytes);
}

export function createProofOutput(networkId: number, applicantHash: string, lovelace: bigint) {
  const scriptCredential = Cardano.StakeCredential.from_scripthash(validatorHash);
  const scriptAddress = Cardano.EnterpriseAddress.new(networkId, scriptCredential).to_address();
  const output = Cardano.TransactionOutput.new(
    scriptAddress,
    Cardano.Value.new(Cardano.BigNum.from_str(lovelace.toString()))
  );

  output.set_plutus_data(createInlineDatum(applicantHash));
  return output;
}
