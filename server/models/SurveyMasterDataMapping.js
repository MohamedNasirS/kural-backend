import mongoose from "mongoose";

const responseValueMappingSchema = new mongoose.Schema(
  {
    surveyResponseValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    masterDataAnswerValue: {
      type: String,
      trim: true,
    },
    masterDataAnswerLabel: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const mappingItemSchema = new mongoose.Schema(
  {
    masterDataSectionId: {
      type: String,
      required: true,
      trim: true,
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
    surveyQuestionId: {
      type: String,
      required: true,
      trim: true,
    },
    surveyQuestionText: {
      type: String,
      required: true,
      trim: true,
    },
    mappingType: {
      type: String,
      enum: ["direct", "transformation", "value-mapping"],
      default: "direct",
    },
    transformationRule: {
      type: String,
      trim: true,
    },
    responseValueMappings: {
      type: [responseValueMappingSchema],
      default: undefined,
    },
  },
  {
    _id: false,
  }
);

const surveyMasterDataMappingSchema = new mongoose.Schema(
  {
    surveyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    surveyTitle: {
      type: String,
      required: true,
      trim: true,
    },
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
    mappings: {
      type: [mappingItemSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByRole: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "surveymasterdatamappings",
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

surveyMasterDataMappingSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

// Index for faster queries
surveyMasterDataMappingSchema.index({ surveyId: 1, masterDataSectionId: 1 });

export default mongoose.models.SurveyMasterDataMapping ||
  mongoose.model("SurveyMasterDataMapping", surveyMasterDataMappingSchema);

