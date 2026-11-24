import pino from "pino";

/**
 * Logger terstruktur berbasis pino untuk Route Handler dan service layer.
 * Jangan dipakai di Edge runtime (proxy.ts).
 */
export const logger = pino({
  name: "kelo-erp",
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: [
      "password",
      "password_hash",
      "*.password",
      "*.password_hash",
      "req.headers.cookie",
      "req.headers.authorization",
    ],
    censor: "[REDACTED]",
  },
});
