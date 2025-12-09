import express from "express";
import { connectToDatabase } from "../config/database.js";
import { getVoterModel, aggregateVoters } from "../utils/voterCollection.js";
import { isAuthenticated, canAccessAC } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Get families for a specific AC (aggregated from voters by familyId)
router.get("/:acId", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { booth, search, page = 1, limit = 50 } = req.query;

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    // AC Isolation: Check if user can access this AC
    if (!canAccessAC(req.user, acId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this AC's data."
      });
    }

    // Build match query - only include voters with valid familyId
    const matchQuery = {
      familyId: { $exists: true, $nin: [null, ""] }
    };

    if (booth && booth !== 'all') {
      // booth can be:
      // - A number like "1" (filter by boothno)
      // - A booth ID like "BOOTH1-111" (filter by booth_id)
      // - A booth number string like "BOOTH1" (filter by boothno string)
      const boothNum = parseInt(booth);
      if (!isNaN(boothNum) && String(boothNum) === booth) {
        // Pure numeric value - filter by numeric boothno
        matchQuery.boothno = boothNum;
      } else if (booth.includes('-')) {
        // Contains hyphen - likely a booth_id like "BOOTH1-111"
        matchQuery.booth_id = booth;
      } else {
        // String like "BOOTH1" - filter by boothno string OR booth_id pattern
        matchQuery.$or = [
          { boothno: booth },
          { booth_id: new RegExp(`^${booth}-`, 'i') }
        ];
      }
    }

    // Aggregate families by grouping voters by familyId (proper family grouping)
    const familiesAggregation = await aggregateVoters(acId, [
      { $match: matchQuery },
      {
        $group: {
          _id: "$familyId",
          family_head: { $first: "$familyHead" },
          first_member_name: { $first: "$name" },
          members: { $sum: 1 },
          voters: {
            $push: {
              id: "$_id",
              name: "$name",
              voterID: "$voterID",
              age: "$age",
              gender: "$gender",
              mobile: "$mobile",
              relationToHead: "$relationToHead",
              surveyed: "$surveyed"
            }
          },
          address: { $first: "$address" },
          booth: { $first: "$boothname" },
          boothno: { $first: "$boothno" },
          booth_id: { $first: "$booth_id" },
          mobile: { $first: "$mobile" }
        }
      },
      { $sort: { "boothno": 1, "_id": 1 } }
    ]);

    // Apply search filter
    let filteredFamilies = familiesAggregation;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFamilies = familiesAggregation.filter(family => {
        // Search in family head name
        const headMatch = family.family_head?.toLowerCase().includes(searchLower);
        // Search in first member name (english or tamil)
        const firstMemberMatch =
          family.first_member_name?.english?.toLowerCase().includes(searchLower) ||
          family.first_member_name?.tamil?.toLowerCase().includes(searchLower);
        // Search in address
        const addressMatch = family.address?.toLowerCase().includes(searchLower);
        // Search in familyId
        const familyIdMatch = family._id?.toLowerCase().includes(searchLower);

        return headMatch || firstMemberMatch || addressMatch || familyIdMatch;
      });
    }

    // Pagination
    const total = filteredFamilies.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFamilies = filteredFamilies.slice(skip, skip + parseInt(limit));

    return res.json({
      families: paginatedFamilies.map((family) => {
        // Get the family head name - prefer familyHead field, then first member's name
        const headName = family.family_head ||
                        family.first_member_name?.english ||
                        family.first_member_name?.tamil ||
                        family.voters[0]?.name?.english ||
                        family.voters[0]?.name?.tamil ||
                        'N/A';

        return {
          id: family._id, // Use the actual familyId
          family_head: headName,
          members: family.members,
          address: family.address || 'N/A',
          booth: family.booth || `Booth ${family.boothno || 'N/A'}`,
          boothNo: family.boothno,
          booth_id: family.booth_id,
          phone: family.mobile ? `+91 ${family.mobile}` : 'N/A',
          status: family.members > 0 ? 'Active' : 'Inactive',
          voters: family.voters.map(v => ({
            ...v,
            name: v.name?.english || v.name?.tamil || v.name || 'N/A'
          }))
        };
      }),
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

// Get detailed family information by familyId
router.get("/:acId/details", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { familyId, address, booth, boothNo } = req.query;

    console.log('Family details request:', { acId, familyId, address, booth, boothNo });

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    // AC Isolation: Check if user can access this AC
    if (!canAccessAC(req.user, acId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this AC's data."
      });
    }

    const VoterModel = getVoterModel(acId);
    let members = [];

    // Primary lookup by familyId (preferred method)
    if (familyId) {
      members = await VoterModel.find({ familyId: familyId })
        .sort({ relationToHead: 1, age: -1 })
        .lean();
    }

    // Fallback to address+booth lookup for backward compatibility
    if (members.length === 0 && address && booth) {
      const matchQuery = {
        address: address,
        boothname: booth
      };

      if (boothNo) {
        // Handle boothNo - it could be a number or string like "BOOTH1"
        const boothNoNum = parseInt(boothNo);
        if (!isNaN(boothNoNum)) {
          matchQuery.boothno = boothNoNum;
        } else {
          matchQuery.boothno = boothNo;
        }
      }

      members = await VoterModel.find(matchQuery)
        .sort({ age: -1 })
        .lean();
    }

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

    // Find the family head - prefer member with relationToHead === 'Self'
    const familyHead = members.find(m => m.relationToHead === 'Self') || members[0];

    const formattedMembers = members.map((member) => ({
      id: member._id.toString(),
      name: member.name?.english || member.name?.tamil || 'N/A',
      voterID: member.voterID || 'N/A',
      age: member.age || 0,
      gender: member.gender || 'N/A',
      relationship: member.relationToHead || (member._id.toString() === familyHead._id.toString() ? 'Head' : 'Member'),
      phone: member.mobile ? `+91 ${member.mobile}` : '',
      surveyed: member.surveyed === true,
      surveyedAt: member.verifiedAt || member.surveyedAt || null,
      religion: member.religion || 'N/A',
      caste: member.caste || 'N/A'
    }));

    return res.json({
      success: true,
      family: {
        id: familyId || members[0].familyId || `${address}-${booth}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase(),
        headName: familyHead.familyHead || familyHead.name?.english || familyHead.name?.tamil || 'N/A',
        address: familyHead.address || address || 'N/A',
        booth: familyHead.boothname || booth || 'N/A',
        boothNo: familyHead.boothno || 0,
        booth_id: familyHead.booth_id || '',
        acId: acId,
        acName: familyHead.aci_name || `AC ${acId}`,
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
