import mongoose from "mongoose";

const masterDataSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    order: {
      type: Number,
      default: 0,
    },
    aci_id: {
      type: [Number],
      default: function() {
        return [];
      },
      required: false,
    },
    aci_name: {
      type: [String],
      default: function() {
        return [];
      },
      required: false,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

masterDataSectionSchema.index({ order: 1, name: 1 });

const MasterDataSection = mongoose.model(
  "MasterDataSection",
  masterDataSectionSchema,
  "masterDataSections",
);

export default MasterDataSection;


