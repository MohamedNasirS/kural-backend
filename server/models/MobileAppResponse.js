import mongoose from "mongoose";

const mobileAppResponseSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    collection: "mobileappresponses",
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

mobileAppResponseSchema.virtual("id").get(function getId() {
  return this._id?.toString?.();
});

// Add indexes for common query patterns (ISS-003 fix)
mobileAppResponseSchema.index({ aci_id: 1 });
mobileAppResponseSchema.index({ acId: 1 });  // Legacy AC field
mobileAppResponseSchema.index({ booth_id: 1 });
mobileAppResponseSchema.index({ boothId: 1 });  // Legacy booth field
mobileAppResponseSchema.index({ agentId: 1 });
mobileAppResponseSchema.index({ createdAt: -1 });
mobileAppResponseSchema.index({ aci_id: 1, booth_id: 1 });
mobileAppResponseSchema.index({ aci_id: 1, createdAt: -1 });  // Compound for AC + sort
mobileAppResponseSchema.index({ respondentVoterId: 1 }, { sparse: true });
// Text index for search operations (ISS-005 partial)
mobileAppResponseSchema.index(
  { respondentName: 'text', phoneNumber: 'text', voterId: 'text', phone: 'text', name: 'text' },
  { name: 'response_search_text', default_language: 'none' }
);

const MobileAppResponse =
  mongoose.models.MobileAppResponse ||
  mongoose.model("MobileAppResponse", mobileAppResponseSchema);

export default MobileAppResponse;


