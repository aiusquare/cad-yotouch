use aiken/test
use aiken/transaction
use validators/identity_validator

fn dummy_context() -> transaction::ScriptContext {
  transaction::ScriptContext {
    transaction: transaction::placeholder(),
    purpose: transaction::ScriptPurpose::Spend(
      transaction::OutputReference {
        transaction_id: transaction::TransactionId {
          hash: #"0000000000000000000000000000000000000000000000000000000000000000",
        },
        output_index: 0,
      },
    ),
  }
}

test "valid redeemer passes" {
  let datum = #0011
  let redeemer = identity_validator::VerificationRedeemer::Submit {
    applicant_hash: datum,
    score: 80,
    reviewer_signatures: [#aa, #bb, #cc],
  }

  identity_validator::identity_validator(datum, redeemer, dummy_context())
}