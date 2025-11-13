import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const byPhoneString = await User.findOne({ phone: "9438804293" });
  console.log("findOne by phone string:", byPhoneString?.toObject() ?? null);

  const byPhoneNumber = await User.findOne({ phone: 9438804293 });
  console.log("findOne by phone number:", byPhoneNumber?.toObject() ?? null);

  const byEmail = await User.findOne({ email: "9438804293" });
  console.log("findOne by email string:", byEmail?.toObject() ?? null);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  mongoose.disconnect();
});


