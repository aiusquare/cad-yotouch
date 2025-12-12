export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

export interface SubmitProofPayload {
  applicantHash: string;
  score: number;
  reviewerSignatures: string[];
}

export async function submitProof(payload: SubmitProofPayload) {
  const response = await fetch(`${API_BASE_URL}/proofs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to submit proof");
  }

  return response.json() as Promise<{ txHash: string }>;
}
