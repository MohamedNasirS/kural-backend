import express from "express";
import { connectToDatabase } from "../config/database.js";
import { getVoterModel, aggregateVoters } from "../utils/voterCollection.js";

const router = express.Router();

// Get families for a specific AC (aggregated from voters)
router.get("/:acId", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { booth, search, page = 1, limit = 50 } = req.query;

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    // Build match query
    const matchQuery = {};

    if (booth && booth !== 'all') {
      const boothNum = parseInt(booth);
      if (!isNaN(boothNum)) {
        matchQuery.boothno = boothNum;
      } else {
        matchQuery.boothname = booth;
      }
    }

    // Aggregate families by grouping voters with same address and booth
    const familiesAggregation = await aggregateVoters(acId, [
      { $match: matchQuery },
      {
        $group: {
          _id: {
            address: "$address",
            booth: "$boothname",
            boothno: "$boothno"
          },
          family_head: { $first: "$name" },
          members: { $sum: 1 },
          voters: { $push: { name: "$name", voterID: "$voterID", age: "$age", gender: "$gender", mobile: "$mobile" } },
          mobile: { $first: "$mobile" }
        }
      },
      { $sort: { "_id.boothno": 1, "_id.address": 1 } }
    ]);

    // Apply search filter
    let filteredFamilies = familiesAggregation;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFamilies = familiesAggregation.filter(family =>
        (family.family_head?.english?.toLowerCase().includes(searchLower) ||
         family.family_head?.tamil?.toLowerCase().includes(searchLower) ||
         family._id.address?.toLowerCase().includes(searchLower))
      );
    }

    // Pagination
    const total = filteredFamilies.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFamilies = filteredFamilies.slice(skip, skip + parseInt(limit));

    return res.json({
      families: paginatedFamilies.map((family, index) => ({
        id: `FAM${skip + index + 1}`.padStart(8, '0'),
        family_head: family.family_head?.english || family.family_head?.tamil || family.voters[0]?.name?.english || 'N/A',
        members: family.members,
        address: family._id.address || 'N/A',
        booth: family._id.booth || `Booth ${family._id.boothno || 'N/A'}`,
        boothNo: family._id.boothno,
        phone: family.mobile ? `+91 ${family.mobile}` : 'N/A',
        status: family.members > 0 ? 'Active' : 'Inactive',
        voters: family.voters
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error fetching families:", error);
    return res.status(500).json({ message: "Failed to fetch families" });
  }
});

// Get detailed family information by address and booth
router.get("/:acId/details", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { address, booth, boothNo } = req.query;

    console.log('Family details request:', { acId, address, booth, boothNo });

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    if (!address || !booth) {
      return res.status(400).json({ message: "Address and booth are required" });
    }

    const matchQuery = {
      address: address,
      boothname: booth
    };

    if (boothNo) {
      matchQuery.boothno = parseInt(boothNo);
    }

    const VoterModel = getVoterModel(acId);

    const members = await VoterModel.find(matchQuery)
      .sort({ age: -1 })
      .lean();

    console.log('Found members:', members.length);

    if (members.length === 0) {
      return res.status(404).json({ message: "Family not found" });
    }

    // Calculate demographics
    const demographics = {
      totalMembers: members.length,
      male: members.filter(m => m.gender === 'Male').length,
      female: members.filter(m => m.gender === 'Female').length,
      surveyed: members.filter(m => m.surveyed === true).length,
      pending: members.filter(m => m.surveyed !== true).length,
      averageAge: Math.round(members.reduce((sum, m) => sum + (m.age || 0), 0) / members.length)
    };

    const familyHead = members[0];

    const formattedMembers = members.map((member, index) => ({
      id: member._id.toString(),
      name: member.name?.english || member.name?.tamil || 'N/A',
      voterID: member.voterID || 'N/A',
      age: member.age || 0,
      gender: member.gender || 'N/A',
      relationship: index === 0 ? 'Head' : 'Member',
      phone: member.mobile ? `+91 ${member.mobile}` : '',
      surveyed: member.surveyed === true,
      surveyedAt: member.verifiedAt || null,
      religion: member.religion || 'N/A',
      caste: member.caste || 'N/A'
    }));

    return res.json({
      success: true,
      family: {
        id: `${address}-${booth}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase(),
        headName: familyHead.name?.english || familyHead.name?.tamil || 'N/A',
        address: address,
        booth: booth,
        boothNo: members[0].boothno || 0,
        acId: acId,
        acName: members[0].aci_name || `AC ${acId}`,
        phone: familyHead.mobile ? `+91 ${familyHead.mobile}` : 'N/A'
      },
      members: formattedMembers,
      demographics: demographics
    });

  } catch (error) {
    console.error("Error fetching family details:", error);
    return res.status(500).json({ message: "Failed to fetch family details", error: error.message });
  }
});

export default router;
