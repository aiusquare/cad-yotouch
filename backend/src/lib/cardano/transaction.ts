import * as Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import type {
  BlockfrostAmount,
  BlockfrostProtocolParameters,
  BlockfrostUtxo,
} from "./blockfrost.js";

function toBigNum(value: string | number) {
  return Cardano.BigNum.from_str(
    typeof value === "number" ? value.toString() : value
  );
}

function floatToUnitInterval(value: string | number) {
  const raw = (typeof value === "number" ? value.toString() : value).trim();
  if (!raw.includes(".")) {
    return Cardano.UnitInterval.new(
      Cardano.BigNum.from_str(raw),
      Cardano.BigNum.from_str("1")
    );
  }
  const [wholePart, fractionalPart] = raw.split(".");
  const sanitizedWhole = wholePart.length ? wholePart : "0";
  const numerator = BigInt(`${sanitizedWhole}${fractionalPart}`);
  const denominator = 10n ** BigInt(fractionalPart.length);
  return Cardano.UnitInterval.new(
    Cardano.BigNum.from_str(numerator.toString()),
    Cardano.BigNum.from_str(denominator.toString())
  );
}

function normalizeNumber(value: string | number | undefined, fallback: number) {
  if (value === undefined || value === null) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildTxConfig(params: BlockfrostProtocolParameters) {
  const linearFee = Cardano.LinearFee.new(
    toBigNum(params.min_fee_a),
    toBigNum(params.min_fee_b)
  );
  const exUnitPrices = Cardano.ExUnitPrices.new(
    floatToUnitInterval(params.price_mem),
    floatToUnitInterval(params.price_step)
  );

  const coinsPerUtxo =
    params.coins_per_utxo_size ?? params.ada_per_utxo_byte ?? "0";
  const maxTxSize = normalizeNumber(params.max_tx_size, 16384);
  const maxValueSize = normalizeNumber(params.max_value_size, 5000);

  return Cardano.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .coins_per_utxo_byte(toBigNum(coinsPerUtxo))
    .key_deposit(toBigNum(params.key_deposit))
    .pool_deposit(toBigNum(params.pool_deposit))
    .max_tx_size(maxTxSize)
    .max_value_size(maxValueSize)
    .ex_unit_prices(exUnitPrices)
    .build();
}

function toValueFromAmounts(amounts: BlockfrostAmount[]) {
  const lovelace = amounts.find((a) => a.unit === "lovelace")?.quantity ?? "0";
  const value = Cardano.Value.new(Cardano.BigNum.from_str(lovelace));
  const multiAsset = Cardano.MultiAsset.new();
  let hasMultiAssets = false;

  for (const asset of amounts) {
    if (asset.unit === "lovelace") continue;
    const policy = asset.unit.slice(0, 56);
    const assetNameHex = asset.unit.slice(56);
    const scriptHash = Cardano.ScriptHash.from_bytes(
      Buffer.from(policy, "hex")
    );
    const assetName = Cardano.AssetName.from_bytes(
      Buffer.from(assetNameHex, "hex")
    );

    let assets = multiAsset.get(scriptHash);
    if (!assets) {
      assets = Cardano.Assets.new();
      multiAsset.insert(scriptHash, assets);
    }
    assets.insert(assetName, Cardano.BigNum.from_str(asset.quantity));
    hasMultiAssets = true;
  }

  if (hasMultiAssets) {
    value.set_multiasset(multiAsset);
  }

  return value;
}

function fromBlockfrostUtxo(utxo: BlockfrostUtxo) {
  const input = Cardano.TransactionInput.new(
    Cardano.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, "hex")),
    utxo.output_index
  );

  const output = Cardano.TransactionOutput.new(
    Cardano.Address.from_bech32(utxo.address),
    toValueFromAmounts(utxo.amount)
  );

  if (utxo.inline_datum) {
    output.set_plutus_data(
      Cardano.PlutusData.from_bytes(Buffer.from(utxo.inline_datum, "hex"))
    );
  } else if (utxo.data_hash) {
    output.set_data_hash(
      Cardano.DataHash.from_bytes(Buffer.from(utxo.data_hash, "hex"))
    );
  }

  return Cardano.TransactionUnspentOutput.new(input, output);
}

export function buildInputSet(utxos: BlockfrostUtxo[]) {
  const set = Cardano.TransactionUnspentOutputs.new();
  utxos.forEach((utxo) => set.add(fromBlockfrostUtxo(utxo)));
  return set;
}

export function finalizeTransaction(
  builder: Cardano.TransactionBuilder,
  privateKey: Cardano.PrivateKey,
  auxiliaryData?: Cardano.AuxiliaryData
) {
  const txBody = builder.build();
  const txHash = Cardano.hash_transaction(txBody);
  const witnesses = Cardano.TransactionWitnessSet.new();
  const vkeys = Cardano.Vkeywitnesses.new();
  vkeys.add(Cardano.make_vkey_witness(txHash, privateKey));
  witnesses.set_vkeys(vkeys);

  const transaction = Cardano.Transaction.new(
    txBody,
    witnesses,
    auxiliaryData ?? builder.get_auxiliary_data()
  );
  return {
    transaction,
    txHash,
  };
}
