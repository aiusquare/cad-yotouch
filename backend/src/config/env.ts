import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 8080),
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/yotouch",
  CARDANO_WEBHOOK_URL:
    process.env.CARDANO_WEBHOOK_URL ?? "http://localhost:5050/proofs",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL ?? "http://localhost:9000",
  CARDANO_NETWORK: process.env.CARDANO_NETWORK ?? "Preprod",
  BLOCKFROST_API_URL:
    process.env.BLOCKFROST_API_URL ??
    "https://cardano-preprod.blockfrost.io/api/v0",
  BLOCKFROST_PROJECT_ID: process.env.BLOCKFROST_PROJECT_ID,
  CARDANO_SIGNING_KEY: process.env.CARDANO_SIGNING_KEY,
  MONNIFY_BASE_URL:
    process.env.MONNIFY_BASE_URL ?? "https://sandbox.monnify.com",
  MONNIFY_API_KEY: process.env.MONNIFY_API_KEY,
  MONNIFY_SECRET_KEY: process.env.MONNIFY_SECRET_KEY,
  MONNIFY_CONTRACT_CODE: process.env.MONNIFY_CONTRACT_CODE,
};
