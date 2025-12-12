import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  transport:
    env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
  level: env.NODE_ENV === "development" ? "debug" : "info",
});
