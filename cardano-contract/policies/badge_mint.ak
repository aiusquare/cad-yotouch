use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{ScriptHash, VerificationKeyHash}
use aiken/primitive/bytearray
use aiken/primitive/string
use cardano/address.{Credential}
use cardano/assets
use cardano/transaction.{Datum, Input, Output, Transaction}

pub type BadgeMintRedeemer {
  Init { owner: VerificationKeyHash, level: Int }
  Upgrade { owner: VerificationKeyHash, from_level: Int, to_level: Int }
  Retire { owner: VerificationKeyHash, level: Int }
}

const BADGE_HOLDER_HASH: ScriptHash = #"00000000000000000000000000000000000000000000000000000000";
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
              hash == BADGE_HOLDER_HASH
                && assets.quantity_of(output.value, policy_id, badge_asset_name(owner, level)) == 1
                && when output.datum is {
                  Datum::InlineDatum(_) -> True
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
              hash == BADGE_HOLDER_HASH
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
  expect list.length(filtered) = list.length(minted_pairs)

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
      BadgeMintRedeemer::Init { owner, level } -> {
        expect True = ensure_level(level)
        expect True = signer_present(tx.extra_signatories, owner)
        expect_true_init(policy_id, owner, level, tx)
      }
      BadgeMintRedeemer::Upgrade { owner, from_level, to_level } -> {
        expect True = ensure_level(from_level)
        expect True = ensure_level(to_level)
        expect True = signer_present(tx.extra_signatories, owner)
        expect to_level = from_level + 1
        expect_true_upgrade(policy_id, owner, from_level, to_level, tx)
      }
      BadgeMintRedeemer::Retire { owner, level } -> {
        expect True = ensure_level(level)
        expect True = signer_present(tx.extra_signatories, owner)
        expect_true_retire(policy_id, owner, level, tx)
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
