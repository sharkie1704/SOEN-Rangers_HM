// For Node
import "dotenv/config"; // must stay first so JWT_SECRET is loaded before container.ts runs
import express from "express";
import cookieParser from "cookie-parser";
import { requireAuth } from "./container";

const app = express();

app.use(express.json());
app.use(cookieParser());

// Public routes (no session needed)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// BTW everything mounted after this line requires a valid session (R-REG-02)
app.use("/api", requireAuth);

// Temporary route to check the gate works. To be deleted once real routes exist
app.get("/api/me", (req, res) => {
  res.json(req.user);
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});