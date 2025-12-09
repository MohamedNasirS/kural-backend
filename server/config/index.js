import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({
  path: fs.existsSync(envPath) ? envPath : undefined,
});

export const PORT = process.env.PORT || 4000;
export const isProduction = process.env.NODE_ENV === "production";

export const DEFAULT_LOCALHOST_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:3000",
];

export const CLIENT_ORIGINS = Array.from(
  new Set(
    (process.env.CLIENT_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .concat(isProduction ? [] : DEFAULT_LOCALHOST_ORIGINS),
  ),
);

export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kuralapp";

export const SESSION_COOKIE_DOMAIN =
  process.env.SESSION_COOKIE_DOMAIN && process.env.SESSION_COOKIE_DOMAIN.trim()
    ? process.env.SESSION_COOKIE_DOMAIN.trim()
    : undefined;

export const SESSION_COOKIE_SAMESITE =
  process.env.SESSION_COOKIE_SAMESITE?.toLowerCase() || (isProduction ? "lax" : "lax");

// Session secret - MUST be set in production
const defaultSecret = "kural-election-management-secret-key-2024";
export const SESSION_SECRET = process.env.SESSION_SECRET || defaultSecret;

// Warn if using default secret in production
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === defaultSecret)) {
  console.error("=".repeat(80));
  console.error("SECURITY WARNING: SESSION_SECRET is not set or using default value in production!");
  console.error("Please set a strong SESSION_SECRET environment variable.");
  console.error("=".repeat(80));
}
