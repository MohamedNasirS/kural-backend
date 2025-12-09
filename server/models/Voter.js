import mongoose from 'mongoose';

const voterSchema = new mongoose.Schema({
  name: {
    english: String,
    tamil: String
  },
  voterID: String,
  address: String,
  DOB: Date,
  fathername: String,
  doornumber: Number,
  fatherless: Boolean,
  guardian: String,
  age: Number,
  gender: String,
  mobile: Number,
  emailid: String,
  aadhar: String,
  PAN: String,
  religion: String,
  caste: String,
  subcaste: String,
  booth_id: String,
  boothname: String,
  boothno: Number,
  status: String,
  verified: Boolean,
  verifiedAt: Date,
  surveyed: {
    type: Boolean,
    default: false,
  },
  aci_id: Number,
  aci_name: String
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

const Voter = mongoose.model('Voter', voterSchema, 'voters');

export default Voter;
