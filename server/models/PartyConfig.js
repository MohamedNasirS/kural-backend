/**
 * Party Config Model
 * Stores "our party" configuration per AC for sentiment calculation
 */

import mongoose from "mongoose";

const partyConfigSchema = new mongoose.Schema(
  {
    acId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    acName: {
      type: String,
    },
    ourParty: {
      type: String,
      required: true,
    },
    ourPartyShort: {
      type: String,
      required: true,
    },
    mlaUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "party_config",
  }
);

export default mongoose.models.PartyConfig || mongoose.model("PartyConfig", partyConfigSchema);
