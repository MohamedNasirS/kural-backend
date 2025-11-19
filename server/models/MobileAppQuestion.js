import mongoose from "mongoose";

const answerOptionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
    order: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Reference to the master option ID from master data for analysis purposes
    masterOptionId: {
      type: String,
      trim: true,
    },
  },
  { _id: true },
);

const mobileAppQuestionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: [
        "short-answer",
        "long-answer",
        "multiple-choice",
        "checkboxes",
        "dropdown",
        "number",
        "date",
        "email",
        "phone",
        "rating",
      ],
      required: true,
      default: "short-answer",
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    helperText: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    order: {
      type: Number,
      default: 0,
    },
    options: {
      type: [answerOptionSchema],
      default: [],
    },
    // Reference to the master question ID if imported from master data
    masterQuestionId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "mobileappquestions",
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

mobileAppQuestionSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

mobileAppQuestionSchema.index({ order: 1, createdAt: 1 });

const MobileAppQuestion = mongoose.models.MobileAppQuestion ||
  mongoose.model("MobileAppQuestion", mobileAppQuestionSchema);

export default MobileAppQuestion;

