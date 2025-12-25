import mongoose from 'mongoose';

const voterSchema = new mongoose.Schema({
  name: {
    english: String,
    tamil: String
  },
  voterID: String,
  address: String,
  address_tamil: String,
  DOB: Date,
  doornumber: mongoose.Schema.Types.Mixed,
  age: Number,
  gender: String,
  mobile: mongoose.Schema.Types.Mixed,
  emailid: String,
  aadhar: String,
  PAN: String,
  religion: String,
  caste: String,
  subcaste: String,

  // Booth/Polling Station Info
  booth_id: String,
  boothname: String,
  boothname_tamil: String,
  boothno: Number,

  // Ward Info (from SIR)
  ward_no: Number,
  ward_name: String,
  ward_name_english: String,

  // Relative/Guardian Info (replaces fathername, guardian, fatherless)
  relative: {
    name: {
      english: String,
      tamil: String
    },
    relation: String  // Father, Husband, Mother
  },

  // SIR Status Fields
  isActive: { type: Boolean, default: true },
  currentSirStatus: String,  // passed, removed, reinstated, new
  currentSirRevision: String,  // december2024, february2025
  sirStatus: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sirPageNo: Number,

  // Booth Change Tracking
  boothVersion: { type: Number, default: 1 },
  boothUpdatedAt: Date,
  boothUpdatedFrom: String,
  previousBooth: {
    booth_id: String,
    boothno: Number,
    boothname: String,
    version: Number
  },
  boothHistory: [{
    booth_id: String,
    boothno: Number,
    boothname: String,
    version: Number,
    from: String,
    changedAt: Date
  }],

  // Other fields
  status: String,
  verified: Boolean,
  verifiedAt: Date,
  surveyed: {
    type: Boolean,
    default: false,
  },
  surveyedAt: Date,
  aci_id: Number,
  aci_name: String,
  aci_name_tamil: String,
  familyId: String,
  booth_agent_id: String
}, {
  timestamps: true,
  strict: false, // Allow dynamic fields for voter records
});

// Add indexes for common query patterns
// Index for AC filtering (most common query)
voterSchema.index({ aci_id: 1 });

// Compound index for AC + booth queries
voterSchema.index({ aci_id: 1, booth_id: 1 });

// Index for booth filtering
voterSchema.index({ booth_id: 1 });

// Index for voter ID lookups
voterSchema.index({ voterID: 1 });

// Index for survey status filtering
voterSchema.index({ surveyed: 1 });

// Compound index for AC + survey status (common dashboard query)
voterSchema.index({ aci_id: 1, surveyed: 1 });

// Index for family lookups (if familyId field exists)
voterSchema.index({ familyId: 1 }, { sparse: true });

// Index for mobile lookups
voterSchema.index({ mobile: 1 }, { sparse: true });

// SIR Status indexes
voterSchema.index({ isActive: 1 });
voterSchema.index({ currentSirStatus: 1 });
voterSchema.index({ aci_id: 1, isActive: 1 });
voterSchema.index({ boothno: 1, isActive: 1 });

// Ward index
voterSchema.index({ ward_no: 1 }, { sparse: true });

const Voter = mongoose.model('Voter', voterSchema, 'voters');

export default Voter;
