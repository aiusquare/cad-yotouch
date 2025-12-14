use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/primitive/bytearray
use cardano/address.{Credential}
use cardano/assets
use cardano/transaction.{Datum, Input, Output, Transaction}

pub type BadgeMintRedeemer {
  Init { owner: VerificationKeyHash, level: Int }
  Upgrade { owner: VerificationKeyHash, from_level: Int, to_level: Int }
  Retire { owner: VerificationKeyHash, level: Int }
}

// Hash of `badge_holder.badge_holder.spend` from the compiled blueprint.
// This is used by the minting policy to ensure the minted token is locked at the badge-holder script.
const badge_holder_hash = #"7fcc64dd81dceb562d4511dcf481b4fd620a845abae82cfd5fac33dc"

fn badge_levels() -> List<Int> {
  [0, 1, 2, 3, 4]
}

fn ensure_level(target: Int) -> Bool {
  badge_levels() |> list.any(fn(level) { level == target })
}

fn badge_asset_name(owner: VerificationKeyHash, level: Int) -> ByteArray {
  // Asset names are limited to 32 bytes.
  // Compact format: 0x59 ('Y') || level_u8 || owner_vkh(28 bytes)
  bytearray.concat(#"59", bytearray.concat(bytearray.from_int_big_endian(level, 1), owner))
}

fn signer_present(signers: List<VerificationKeyHash>, owner: VerificationKeyHash) -> Bool {
  signers |> list.any(fn(sig) { sig == owner })
}

fn has_script_badge_output(
  outputs: List<Output>,
  policy_id: assets.PolicyId,
  owner: VerificationKeyHash,
  level: Int,
) -> Bool {
  outputs
    |> list.any(
        fn(output) {
          when output.address.payment_credential is {
            Credential.Script(hash) ->
              hash == badge_holder_hash
                && assets.quantity_of(output.value, policy_id, badge_asset_name(owner, level)) == 1
                && when output.datum is {
                  Datum.InlineDatum(_) -> True
                  _ -> False
                }
            Credential.VerificationKey(_) -> False
          }
        },
      )
}

fn has_script_badge_input(
  inputs: List<Input>,
  policy_id: assets.PolicyId,
  owner: VerificationKeyHash,
  level: Int,
) -> Bool {
  inputs
    |> list.any(
        fn(input) {
          when input.output.address.payment_credential is {
            Credential.Script(hash) ->
              hash == badge_holder_hash
                && assets.quantity_of(input.output.value, policy_id, badge_asset_name(owner, level)) == 1
            Credential.VerificationKey(_) -> False
          }
        },
      )
}

fn expect_exact_policy_mint(
  tx: Transaction,
  policy_id: assets.PolicyId,
  expected: List<(ByteArray, Int)>,
) {
  let filtered = expected |> list.filter(fn((_, qty)) { qty != 0 })
  let minted = tx.mint |> assets.tokens(policy_id)
  let minted_pairs = minted |> dict.to_pairs
  expect True = list.length(filtered) == list.length(minted_pairs)

  expect True =
    filtered
      |> list.all(
          fn((asset_name, qty)) {
            when dict.get(minted, asset_name) is {
              Some(actual) -> actual == qty
              None -> False
            }
          },
        )
}

validator badge_mint {
  mint(redeemer: BadgeMintRedeemer, policy_id: assets.PolicyId, tx: Transaction) {
    when redeemer is {
      Init { owner, level } -> {
        expect True = ensure_level(level)
        expect True = signer_present(tx.extra_signatories, owner)
        expect_true_init(policy_id, owner, level, tx)
        True
      }
      Upgrade { owner, from_level, to_level } -> {
        expect True = ensure_level(from_level)
        expect True = ensure_level(to_level)
        expect True = signer_present(tx.extra_signatories, owner)
        expect True = to_level == from_level + 1
        expect_true_upgrade(policy_id, owner, from_level, to_level, tx)
        True
      }
      Retire { owner, level } -> {
        expect True = ensure_level(level)
        expect True = signer_present(tx.extra_signatories, owner)
        expect_true_retire(policy_id, owner, level, tx)
        True
      }
    }
  }
}

fn expect_true_init(policy_id, owner, level, tx) {
  expect_exact_policy_mint(
    tx,
    policy_id,
    [(badge_asset_name(owner, level), 1)],
  )
  expect True = has_script_badge_output(tx.outputs, policy_id, owner, level)
}

fn expect_true_upgrade(policy_id, owner, from_level, to_level, tx) {
  expect_exact_policy_mint(
    tx,
    policy_id,
    [
      (badge_asset_name(owner, from_level), -1),
      (badge_asset_name(owner, to_level), 1),
    ],
  )
  expect True = has_script_badge_input(tx.inputs, policy_id, owner, from_level)
  expect True = has_script_badge_output(tx.outputs, policy_id, owner, to_level)
}

fn expect_true_retire(policy_id, owner, level, tx) {
  expect_exact_policy_mint(
    tx,
    policy_id,
    [(badge_asset_name(owner, level), -1)],
  )
  expect True = has_script_badge_input(tx.inputs, policy_id, owner, level)
}
