/**
 * Election Result Model
 * Stores booth-wise election results for MLA Dashboard
 */

import mongoose from "mongoose";

const partyResultSchema = new mongoose.Schema({
  party: { type: String, required: true },
  partyShort: { type: String }, // Short name like AIADMK, DMK
  candidate: { type: String, required: true },
  votes: { type: Number, required: true },
  voteSharePercent: { type: Number, required: true },
}, { _id: false });

const electionResultSchema = new mongoose.Schema(
  {
    acId: {
      type: Number,
      required: true,
      index: true,
    },
    acName: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      default: 2021,
    },
    electionType: {
      type: String,
      enum: ["Assembly", "Parliament"],
      default: "Assembly",
    },
    boothNo: {
      type: String,
      required: true,
    },
    boothName: {
      type: String,
      default: "",
    },

    // All party results
    results: [partyResultSchema],

    // Vote totals
    totalVotes: {
      type: Number,
      required: true,
    },
    registeredVoters: {
      type: Number,
      default: 0,
    },
    turnoutPercent: {
      type: Number,
      default: 0,
    },

    // Winner info
    winner: {
      party: { type: String },
      partyShort: { type: String },
      candidate: { type: String },
      votes: { type: Number },
      voteSharePercent: { type: Number },
    },

    // Runner-up info
    runnerUp: {
      party: { type: String },
      partyShort: { type: String },
      candidate: { type: String },
      votes: { type: Number },
      voteSharePercent: { type: Number },
    },

    // "Our party" result (configured party for sentiment)
    ourParty: {
      party: { type: String },
      partyShort: { type: String },
      votes: { type: Number },
      voteSharePercent: { type: Number },
      isWinner: { type: Boolean },
    },

    // Margin analysis
    margin: {
      type: Number,
      required: true,
    },
    marginPercent: {
      type: Number,
      required: true,
    },
    gapToFlip: {
      type: Number, // Votes needed to flip (Math.floor(margin/2) + 1)
      default: 0,
    },

    // Sentiment: favorable (won), negative (lost), balanced (close), flippable (lost by <100)
    sentiment: {
      type: String,
      enum: ["favorable", "negative", "balanced", "flippable"],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "election_results",
  }
);

// Compound unique index
electionResultSchema.index({ acId: 1, year: 1, boothNo: 1 }, { unique: true });

// Query indexes
electionResultSchema.index({ acId: 1, sentiment: 1 });
electionResultSchema.index({ acId: 1, margin: 1 });
electionResultSchema.index({ acId: 1, "ourParty.voteSharePercent": 1 });

export default mongoose.models.ElectionResult || mongoose.model("ElectionResult", electionResultSchema);
