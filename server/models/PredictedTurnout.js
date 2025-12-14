/**
 * Predicted Turnout Model
 * Stores predicted voter turnout for future elections
 */

import mongoose from "mongoose";

const predictedTurnoutSchema = new mongoose.Schema(
  {
    acName: {
      type: String,
      required: true,
    },
    acId: {
      type: Number,
      index: true,
    },
    district: {
      type: String,
      required: true,
    },
    predictedPollPercent: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      default: 2026,
    },
  },
  {
    timestamps: true,
    collection: "predicted_turnout",
  }
);

// Index for lookups
predictedTurnoutSchema.index({ acName: 1, year: 1 });
predictedTurnoutSchema.index({ acId: 1, year: 1 });

export default mongoose.models.PredictedTurnout || mongoose.model("PredictedTurnout", predictedTurnoutSchema);
