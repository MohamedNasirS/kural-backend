import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const identifier = process.argv[2];

if (!identifier) {
  console.error("Usage: node scripts/debugLookup.js <identifier>");
  process.exit(1);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const trimmedIdentifier = String(identifier).trim();
  const normalizedIdentifier = trimmedIdentifier.toLowerCase();

  const identifierVariants = new Set();
  const addVariant = (variant) => {
    if (variant === undefined || variant === null) {
      return;
    }
    const value = typeof variant === "string" ? variant.trim() : variant;
    if (value === "" || identifierVariants.has(value)) {
      return;
    }
    identifierVariants.add(value);
  };

  addVariant(trimmedIdentifier);
  addVariant(normalizedIdentifier);

  if (/^\d+$/.test(trimmedIdentifier)) {
    addVariant(Number(trimmedIdentifier));
  }

  const digitsOnly = trimmedIdentifier.replace(/\D/g, "");
  if (digitsOnly && digitsOnly !== trimmedIdentifier) {
    addVariant(digitsOnly);
  }
  if (/^\d+$/.test(digitsOnly)) {
    addVariant(Number(digitsOnly));
    if (digitsOnly.length > 10) {
      addVariant(digitsOnly.slice(-10));
      addVariant(Number(digitsOnly.slice(-10)));
    }
  }

  const lookupConditions = [];
  const conditionKeys = new Set();
  const pushCondition = (condition) => {
    const key = JSON.stringify(condition);
    if (!conditionKeys.has(key)) {
      lookupConditions.push(condition);
      conditionKeys.add(key);
    }
  };

  for (const value of identifierVariants) {
    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      pushCondition({ email: lowerValue });
      pushCondition({ email: value });
      pushCondition({ phone: value });
      pushCondition({ phone: lowerValue });
    } else {
      pushCondition({ phone: value });
    }
  }

  console.log("variants", Array.from(identifierVariants));
  console.log("conditions", lookupConditions);

  const activeFilter = { $or: [{ isActive: { $exists: false } }, { isActive: true }] };

  const user = await User.findOne({
    $and: [{ $or: lookupConditions }, activeFilter],
  }).lean(false);

  console.log("user result", user ? user.toObject() : null);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  mongoose.disconnect();
});

