import { API_BASE_URL } from "./proofs";

export interface NinRecord {
  nin: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
}

export async function fetchNinRecord(nin: string): Promise<NinRecord> {
  const response = await fetch(`${API_BASE_URL}/identities/nin/${nin}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to fetch NIN record");
  }

  return response.json() as Promise<NinRecord>;
}
