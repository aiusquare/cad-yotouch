use aiken/collection/list
use cardano/transaction.{OutputReference, Transaction}

pub type VerificationRedeemer {
  Submit {
    applicant_hash: ByteArray,
    score: Int,
    reviewer_signatures: List<ByteArray>,
  }
}

fn aux(remaining: List<ByteArray>, seen: List<ByteArray>) -> Bool {
  when remaining is {
    [] -> True
    [head, ..tail] ->
      if list.any(seen, fn(item) { item == head }) {
        False
      } else {
        aux(tail, [head, ..seen])
      }
  }
}

fn unique(list: List<ByteArray>) -> Bool {
  aux(list, [])
}

fn has_quorum(signatures: List<ByteArray>) -> Bool {
  list.length(signatures) >= 3
}

validator identity_validator {
  spend(
    datum: Option<ByteArray>,
    redeemer: VerificationRedeemer,
    _utxo: OutputReference,
    _tx: Transaction,
  ) {
    let Submit { applicant_hash, score, reviewer_signatures } = redeemer

    when datum is {
      Some(on_chain_hash) ->
        on_chain_hash == applicant_hash
          && score >= 60
          && has_quorum(reviewer_signatures)
          && unique(reviewer_signatures)
      None -> False
    }
  }
}
