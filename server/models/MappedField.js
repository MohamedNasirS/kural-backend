import mongoose from "mongoose";

const mappedValueSchema = new mongoose.Schema(
  {
    surveyQuestionId: {
      type: String,
      required: true,
      trim: true,
    },
    surveyQuestionText: {
      type: String,
      trim: true,
    },
    surveyResponseValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    masterDataQuestionId: {
      type: String,
      required: true,
      trim: true,
    },
    masterDataQuestionPrompt: {
      type: String,
      required: true,
      trim: true,
    },
    mappedValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    mappingType: {
      type: String,
      enum: ["direct", "transformation", "value-mapping"],
      default: "direct",
    },
    originalValue: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    _id: false,
  }
);

const mappedFieldSchema = new mongoose.Schema(
  {
    // Voter Information
    voterId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    voterName: {
      type: String,
      trim: true,
    },
    voterNameTamil: {
      type: String,
      trim: true,
    },
    voterID: {
      type: String,
      trim: true,
      index: true,
    },
    familyId: {
      type: String,
      trim: true,
      index: true,
    },
    
    // AC Information
    acNumber: {
      type: Number,
      required: true,
      index: true,
    },
    acName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    aci_id: {
      type: Number,
      index: true,
    },
    aci_name: {
      type: String,
      trim: true,
    },
    
    // Booth Information
    boothId: {
      type: String,
      trim: true,
      index: true,
    },
    boothName: {
      type: String,
      trim: true,
    },
    boothNumber: {
      type: String,
      trim: true,
    },
    
    // Survey Information
    surveyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    surveyTitle: {
      type: String,
      trim: true,
    },
    surveyResponseId: {
      type: String,
      trim: true,
      index: true,
    },
    
    // Master Data Information
    masterDataSectionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    masterDataSectionName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Mapping Information
    mappingId: {
      type: String,
      trim: true,
      index: true,
    },
    mappedFields: {
      type: [mappedValueSchema],
      default: [],
    },
    
    // Additional Voter Identifiers
    mobile: {
      type: String,
      trim: true,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    guardian: {
      type: String,
      trim: true,
    },
    
    // Metadata
    mappedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    mappedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    mappedByRole: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "mappedfields",
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
mappedFieldSchema.index({ acNumber: 1, voterId: 1 });
mappedFieldSchema.index({ surveyId: 1, masterDataSectionId: 1 });
mappedFieldSchema.index({ mappedAt: -1 });
mappedFieldSchema.index({ voterID: 1, surveyId: 1 });

mappedFieldSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

export default mongoose.models.MappedField ||
  mongoose.model("MappedField", mappedFieldSchema);

