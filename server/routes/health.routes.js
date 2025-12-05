import express from "express";
import { connectToDatabase } from "../config/database.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    await connectToDatabase();
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(503).json({ status: "error", message: error.message });
  }
});

export default router;
