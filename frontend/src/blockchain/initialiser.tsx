import {
  getValidatorScript,
  getLucidInstance,
  connectWallet,
} from "./identityValidator";

export async function submitIdentityProof(
  applicantHash,
  score,
  reviewerSignatures
) {
  const lucid = await getLucidInstance(
    "preprodzh82T7UG9kJP4gcm8UePmFWZi75Cjnls"
  );

  console.log("Lucid instance created");

  await connectWallet(lucid);

  const script = getValidatorScript();
  const validator = lucid.utils.validatorToScriptHash(script);

  const redeemer = {
    Submit: {
      applicant_hash: applicantHash,
      score: score,
      reviewer_signatures: reviewerSignatures,
    },
  };

  const datum = applicantHash; // same as validator logic

  // const tx = await lucid
  //   .newTx()
  //   .payToContract(validator, { inline: datum }, { lovelace: 1500000n })
  //   .attachSpendingValidator(script)
  //   .addSigner(await lucid.wallet.address())
  //   .complete();

  // const signedTx = await tx.sign().complete();
  // const txHash = await signedTx.submit();

  return "txHash";
}
