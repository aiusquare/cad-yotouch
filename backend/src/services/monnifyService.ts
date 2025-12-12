import axios from "axios";
import { env } from "../config/env.js";

export class MonnifyConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonnifyConfigurationError";
  }
}

export class MonnifyLookupError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "MonnifyLookupError";
    this.status = status;
  }
}

interface MonnifyAuthResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody?: {
    accessToken?: string;
    expiresIn?: number;
  };
}

interface MonnifyNinResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode?: string;
  responseBody?: Record<string, unknown>;
}

export interface NinRecord {
  nin: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
}

const monnifyClient = axios.create({
  baseURL: env.MONNIFY_BASE_URL ?? "https://sandbox.monnify.com",
  timeout: 10_000,
});

let cachedToken: { token: string; expiresAt: number } | null = null;

function assertMonnifyConfig() {
  if (!env.MONNIFY_API_KEY || !env.MONNIFY_SECRET_KEY || !env.MONNIFY_CONTRACT_CODE) {
    throw new MonnifyConfigurationError(
      "Monnify credentials are missing. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE."
    );
  }
}

async function fetchAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  assertMonnifyConfig();

  const authResponse = await monnifyClient.post(
    "/api/v1/auth/login",
    {
      apiKey: env.MONNIFY_API_KEY,
      secretKey: env.MONNIFY_SECRET_KEY,
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  const data = authResponse.data as MonnifyAuthResponse;

  if (!data?.requestSuccessful || !data.responseBody?.accessToken) {
    throw new MonnifyLookupError(data?.responseMessage ?? "Unable to authenticate with Monnify");
  }

  const expiresInMs = Math.max(60, data.responseBody.expiresIn ?? 0) * 1000;
  cachedToken = {
    token: data.responseBody.accessToken,
    expiresAt: Date.now() + expiresInMs,
  };

  return cachedToken.token;
}

function mapNinResponse(response: MonnifyNinResponse, nin: string): NinRecord {
  const payload = response.responseBody ?? {};
  const toStringOrNull = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

  return {
    nin,
    firstName: toStringOrNull(payload.firstName),
    middleName: toStringOrNull(payload.middleName),
    lastName: toStringOrNull(payload.lastName),
    dateOfBirth:
      toStringOrNull(payload.birthDate) ?? toStringOrNull(payload.dateOfBirth),
    gender: toStringOrNull(payload.gender),
    phoneNumber:
      toStringOrNull(payload.telephoneNumber) ??
      toStringOrNull(payload.phoneNumber),
  };
}

export async function fetchNinDetails(nin: string): Promise<NinRecord> {
  assertMonnifyConfig();

  try {
    const accessToken = await fetchAccessToken();
    const ninResponse = await monnifyClient.post(
      "/api/v1/identity/verification/nin",
      {
        nin,
        contractCode: env.MONNIFY_CONTRACT_CODE,
        reference: `NIN-${Date.now()}`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = ninResponse.data as MonnifyNinResponse;

    if (!data?.requestSuccessful) {
      const code = data?.responseCode?.toUpperCase();
      if (code === "INVALID_NIN" || data?.responseMessage?.toLowerCase().includes("not found")) {
        throw new MonnifyLookupError(data.responseMessage ?? "NIN record not found", 404);
      }
      throw new MonnifyLookupError(data?.responseMessage ?? "Unable to retrieve NIN record");
    }

    return mapNinResponse(data, nin);
  } catch (error) {
    if (error instanceof MonnifyLookupError || error instanceof MonnifyConfigurationError) {
      throw error;
    }

    const axiosError = error as {
      response?: {
        status: number;
        statusText?: string;
        data?: MonnifyNinResponse;
      };
    };
    if (axiosError.response) {
      const { data } = axiosError.response;
      const message =
        data?.responseMessage || axiosError.response.statusText || "Monnify lookup failed";
      const code = data?.responseCode?.toUpperCase();
      const status = axiosError.response.status === 404 || code === "INVALID_NIN" ? 404 : 502;
      throw new MonnifyLookupError(message, status);
    }

    throw new MonnifyLookupError(
      error instanceof Error ? error.message : "Unexpected error retrieving NIN record"
    );
  }
}
