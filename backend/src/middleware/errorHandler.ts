import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({ err }, "Unhandled error");

  const anyErr = err as any;
  const isAxiosTimeout =
    anyErr?.name === "AxiosError" &&
    (anyErr?.code === "ECONNABORTED" ||
      (typeof anyErr?.message === "string" &&
        anyErr.message.includes("timeout")));

  if (isAxiosTimeout) {
    return res.status(504).json({
      message: "Upstream timeout",
      cause: err.message,
    });
  }

  res.status(500).json({ message: "Unexpected error", cause: err.message });
}
