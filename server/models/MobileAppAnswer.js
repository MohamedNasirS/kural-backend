import mongoose from "mongoose";

const mobileAppAnswerSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    collection: "mobileappanswers",
    minimize: false,
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString?.() ?? ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

mobileAppAnswerSchema.virtual("id").get(function getId() {
  return this._id?.toString?.();
});

// Add indexes for common query patterns (ISS-004 fix)
mobileAppAnswerSchema.index({ submittedAt: -1 });
mobileAppAnswerSchema.index({ createdAt: -1 });
mobileAppAnswerSchema.index({ syncedAt: -1 });
mobileAppAnswerSchema.index({ questionId: 1 });
mobileAppAnswerSchema.index({ voterId: 1 });
mobileAppAnswerSchema.index({ aci_id: 1 });
mobileAppAnswerSchema.index({ acId: 1 });  // Legacy AC field
mobileAppAnswerSchema.index({ booth_id: 1 });
mobileAppAnswerSchema.index({ boothId: 1 });  // Legacy booth field
mobileAppAnswerSchema.index({ aci_id: 1, submittedAt: -1 });  // Compound for AC + sort
mobileAppAnswerSchema.index({ submittedBy: 1 });
// Text index for search operations (ISS-005 partial)
mobileAppAnswerSchema.index(
  { respondentName: 'text', submittedByName: 'text', boothname: 'text', booth: 'text' },
  { name: 'answer_search_text', default_language: 'none' }
);

const MobileAppAnswer =
  mongoose.models.MobileAppAnswer ||
  mongoose.model("MobileAppAnswer", mobileAppAnswerSchema);

export default MobileAppAnswer;


