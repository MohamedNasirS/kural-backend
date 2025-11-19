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
  },
  { _id: true },
);

const masterQuestionSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataSection",
      required: true,
      index: true,
    },
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
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    options: {
      type: [answerOptionSchema],
      default: [],
      validate: {
        validator(options) {
          // Types that require options
          const optionRequiredTypes = ["multiple-choice", "checkboxes", "dropdown", "rating"];
          if (optionRequiredTypes.includes(this.type)) {
            return Array.isArray(options) && options.length > 0;
          }
          return true;
        },
        message: "This question type must have at least one answer option",
      },
    },
  },
  {
    timestamps: true,
    collection: "masterQuestions",
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

masterQuestionSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

masterQuestionSchema.index({ sectionId: 1, order: 1 });
masterQuestionSchema.index({ sectionId: 1, isVisible: 1 });

const MasterQuestion = mongoose.models.MasterQuestion ||
  mongoose.model("MasterQuestion", masterQuestionSchema);

export default MasterQuestion;

