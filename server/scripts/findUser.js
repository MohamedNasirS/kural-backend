import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const identifier = process.argv[2];

if (!identifier) {
  console.error("Usage: node scripts/findUser.js <identifier>");
  process.exit(1);
}

const trimmed = identifier.trim();
const normalized = trimmed.toLowerCase();
const variants = new Set([trimmed, normalized]);

if (/^\d+$/.test(trimmed)) {
  variants.add(Number(trimmed));
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const value of variants) {
    const result = await User.findOne({
      $or: [
        { email: typeof value === "string" ? value.toLowerCase() : value },
        { phone: value },
      ],
    });

    if (result) {
      console.log("Found user for variant:", value);
      console.log(result.toObject());
      return;
    }
  }

  console.log("No user found for variants:", Array.from(variants));
}

main()
  .then(() => mongoose.disconnect())
  .catch((error) => {
    console.error(error);
    mongoose.disconnect();
  });


