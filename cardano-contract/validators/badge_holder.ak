use aiken/collection/list
use aiken/crypto.{ScriptHash, VerificationKeyHash}
use aiken/primitive/bytearray
use aiken/primitive/string
use cardano/address.{Credential}
use cardano/assets
use cardano/transaction
use cardano/transaction.{Output, OutputReference, Transaction}

pub type BadgeDatum {
  BadgeDatum {
    owner: VerificationKeyHash,
    level: Int,
    policy_id: assets.PolicyId,
  }
}

pub type BadgeRedeemer {
  Upgrade { new_level: Int }
  Retire
}

fn badge_levels() -> List<Int> {
  [0, 1, 2, 3, 4]
}

fn ensure_level(target: Int) -> Bool {
  badge_levels() |> list.any(fn(level) { level == target })
}

fn badge_asset_name(owner: VerificationKeyHash, level: Int) -> ByteArray {
  let level_str = string.from_int(level)
  let owner_hex = bytearray.to_hex(owner)
  string.join([@"YoBadge", level_str, owner_hex], @"-")
    |> string.to_bytearray
}

fn signer_present(signers: List<VerificationKeyHash>, owner: VerificationKeyHash) -> Bool {
  signers |> list.any(fn(sig) { sig == owner })
}

fn token_delta(tx: Transaction, policy_id: assets.PolicyId, owner: VerificationKeyHash, level: Int) -> Int {
  tx.mint |> assets.quantity_of(policy_id, badge_asset_name(owner, level))
}

fn extract_self_hash(output: Output) -> ScriptHash {
  when output.address.payment_credential is {
    Credential.Script(hash) -> hash
    Credential.VerificationKey(_) -> fail
  }
}

fn has_badge(value: assets.Value, policy_id: assets.PolicyId, owner: VerificationKeyHash, level: Int) -> Bool {
  assets.quantity_of(value, policy_id, badge_asset_name(owner, level)) == 1
}

fn find_badge_output(
  outputs: List<Output>,
  script_hash: ScriptHash,
  policy_id: assets.PolicyId,
  owner: VerificationKeyHash,
  level: Int,
) -> Bool {
  outputs
    |> list.any(
        fn(output) {
          when output.address.payment_credential is {
            Credential.Script(hash) ->
              hash == script_hash && has_badge(output.value, policy_id, owner, level)
            Credential.VerificationKey(_) -> False
          }
        },
      )
}

validator badge_holder {
  spend(datum: Option<BadgeDatum>, redeemer: BadgeRedeemer, utxo: OutputReference, tx: Transaction) {
    expect Some(BadgeDatum { owner, level, policy_id }) = datum
    expect True = ensure_level(level)
    expect True = signer_present(tx.extra_signatories, owner)

    let current_output = tx.inputs |> transaction.resolve_input(utxo)
    let script_hash = extract_self_hash(current_output)

    when redeemer is {
      Upgrade { new_level } -> {
        expect True = ensure_level(new_level)
        expect 1 = new_level - level
        expect True = token_delta(tx, policy_id, owner, level) == -1
        expect True = token_delta(tx, policy_id, owner, new_level) == 1
        expect True = find_badge_output(tx.outputs, script_hash, policy_id, owner, new_level)
        True
      }
      Retire -> {
        expect True = token_delta(tx, policy_id, owner, level) == -1
        expect False = find_badge_output(tx.outputs, script_hash, policy_id, owner, level)
        True
      }
    }
  }
}
