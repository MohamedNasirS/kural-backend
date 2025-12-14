/**
 * AC Election Summary Model
 * Stores AC-level election summary computed from booth results
 */

import mongoose from "mongoose";

const acElectionSummarySchema = new mongoose.Schema(
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

    // Overall AC result
    result: {
      type: String,
      enum: ["won", "lost"],
      required: true,
    },
    totalVotes: {
      type: Number,
      required: true,
    },

    // Our party AC-level result
    ourParty: {
      name: { type: String, required: true },
      shortName: { type: String },
      candidate: { type: String },
      votes: { type: Number, required: true },
      voteSharePercent: { type: Number, required: true },
    },

    // Main opponent
    opponent: {
      name: { type: String },
      shortName: { type: String },
      candidate: { type: String },
      votes: { type: Number },
      voteSharePercent: { type: Number },
    },

    // AC margin
    margin: {
      type: Number,
      required: true,
    },
    marginPercent: {
      type: Number,
      required: true,
    },

    // Booth breakdown
    totalBooths: {
      type: Number,
      required: true,
    },
    boothSentiment: {
      favorable: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      balanced: { type: Number, default: 0 },
      flippable: { type: Number, default: 0 },
    },

    // Flippable analysis
    flippableBooths: {
      count: { type: Number, default: 0 },
      totalGapToFlip: { type: Number, default: 0 },
      avgGapPerBooth: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: "ac_election_summary",
  }
);

// Unique index for AC + year
acElectionSummarySchema.index({ acId: 1, year: 1 }, { unique: true });

export default mongoose.models.ACElectionSummary || mongoose.model("ACElectionSummary", acElectionSummarySchema);
