import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const parseArgs = () => {
  const args = {};
  for (const token of process.argv.slice(2)) {
    if (!token.startsWith("--")) {
      continue;
    }
    const [key, ...rest] = token.slice(2).split("=");
    if (!key) {
      continue;
    }
    args[key] = rest.length > 0 ? rest.join("=").trim() : true;
  }
  return args;
};

const args = parseArgs();

const email = (args.email || process.env.ADMIN_EMAIL || "admin@system.com").toLowerCase();
const password = args.password || process.env.ADMIN_PASSWORD || "Admin@123";
const phone = args.phone || process.env.ADMIN_PHONE || "9999999999";
const name = args.name || process.env.ADMIN_NAME || "System Administrator";
const role = args.role || process.env.ADMIN_ROLE || "Admin";
const assignedAC = args.assignedAC || process.env.ADMIN_ASSIGNED_AC;

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not defined. Set it in server/.env before running this script.");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const update = {
      email,
      phone,
      name,
      role,
      passwordHash,
      password: undefined,
      isActive: true,
      ...(assignedAC ? { assignedAC: Number(assignedAC) || assignedAC } : {}),
    };

    const result = await User.findOneAndUpdate(
      { email },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean(false);

    console.log("Admin account seeded/updated successfully:");
    console.log({
      id: result._id.toString(),
      email: result.email,
      phone: result.phone,
      role: result.role,
      name: result.name,
    });
    console.log("Use these credentials to sign in:");
    console.log({ email, phone, password });
  } catch (error) {
    console.error("Failed to seed admin account", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();


