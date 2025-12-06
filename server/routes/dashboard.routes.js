import express from "express";
import { connectToDatabase } from "../config/database.js";
import { buildAcQuery } from "../utils/helpers.js";
import {
  getVoterModel,
  countVoters,
  aggregateVoters,
  findOneVoter,
} from "../utils/voterCollection.js";

const router = express.Router();

// Dashboard Statistics API
router.get("/stats/:acId", async (req, res) => {
  try {
    await connectToDatabase();

    const rawIdentifier = req.params.acId ?? req.query.aciName ?? req.query.acName;
    const acQuery = buildAcQuery(rawIdentifier);

    if (!acQuery) {
      return res.status(400).json({ message: "Invalid AC identifier" });
    }

    const identifierString =
      typeof rawIdentifier === "string" ? rawIdentifier.trim() : "";
    const numericFromIdentifier = Number(
      identifierString || (typeof rawIdentifier === "number" ? rawIdentifier : NaN),
    );
    const hasNumericIdentifier = Number.isFinite(numericFromIdentifier);

    // Use the AC-specific voter collection - we need a numeric AC ID
    let acId;
    if (hasNumericIdentifier) {
      acId = numericFromIdentifier;
    } else {
      // For name-based lookup, we need to search across collections to find the AC ID
      const voterResult = await findOneVoter({
        $or: [
          { aci_name: new RegExp(`^${identifierString}$`, 'i') },
          { ac_name: new RegExp(`^${identifierString}$`, 'i') }
        ]
      });
      if (voterResult && voterResult.voter) {
        acId = voterResult.voter.aci_id || voterResult.voter.aci_num;
      }
      if (!acId) {
        return res.status(400).json({ message: `AC not found: ${identifierString}` });
      }
    }
    const VoterModel = getVoterModel(acId);

    const acMeta = await VoterModel.findOne({}, {
      aci_name: 1,
      ac_name: 1,
      aci_num: 1,
      aci_id: 1,
    })
      .lean()
      .exec();

    const acName =
      acMeta?.aci_name ??
      acMeta?.ac_name ??
      (identifierString && !hasNumericIdentifier ? identifierString : null);
    const acNumber =
      acMeta?.aci_num ??
      acMeta?.aci_id ??
      (hasNumericIdentifier ? numericFromIdentifier : null);

    // Get total members (voters) for this AC - use sharded collection
    const totalMembers = await countVoters(acId, {});

    // Get unique families by grouping voters with same address and guardian
    const familiesAggregation = await aggregateVoters(acId, [
      { $match: {} },
      {
        $group: {
          _id: {
            address: "$address",
            guardian: "$guardian",
            booth_id: "$booth_id",
          },
        },
      },
      { $count: "total" },
    ]);
    const totalFamilies = familiesAggregation.length > 0 ? familiesAggregation[0].total : 0;

    // Surveys Completed: Count all members who have surveyed: true
    const surveysCompleted = await countVoters(acId, { surveyed: true });

    // Get unique booths for this AC - group by booth_id for accuracy
    const boothsAggregation = await aggregateVoters(acId, [
      { $match: {} },
      { $group: { _id: "$booth_id" } },
      { $count: "total" },
    ]);
    const totalBooths = boothsAggregation.length > 0 ? boothsAggregation[0].total : 0;

    // Get booth-wise data - group by booth_id only to avoid duplicates
    const boothStats = await aggregateVoters(acId, [
      { $match: {} },
      {
        $group: {
          _id: "$boothname",
          boothno: { $first: "$boothno" },
          booth_id: { $first: "$booth_id" },
          voters: { $sum: 1 },
        },
      },
      { $sort: { boothno: 1 } },
      { $limit: 10 },
    ]);

    return res.json({
      acIdentifier:
        (acName ?? (hasNumericIdentifier ? String(numericFromIdentifier) : identifierString)) ||
        null,
      acId: hasNumericIdentifier ? numericFromIdentifier : acNumber ?? null,
      acName: acName ?? null,
      acNumber: acNumber ?? null,
      totalFamilies,      // Total Families
      totalMembers,       // Total Members (voters)
      surveysCompleted,   // Families with all members surveyed
      totalBooths,        // Total Booths
      boothStats: boothStats.map((booth) => ({
        boothNo: booth.boothno,
        boothName: booth._id,  // _id contains boothname from the $group stage
        boothId: booth.booth_id,
        voters: booth.voters,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard statistics" });
  }
});

export default router;
