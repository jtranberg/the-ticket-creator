import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Ticket } from "./models/Ticket.js";

const app = express();

// --- Security & middleware
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// CORS: allow multiple origins
const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / local
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

// Basic rate limit (you can tune per route, per tenant, etc.)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120, // per minute per IP
  standardHeaders: "draft-7",
  legacyHeaders: false
});
app.use(limiter);

// --- Health
app.get("/health", (req, res) => res.json({ ok: true }));

// --- Tickets CRUD

// LIST with basic filters & pagination
app.get("/tickets", async (req, res, next) => {
  try {
    const { status, priority, q, page = 1, pageSize = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (q) filter.title = { $regex: q, $options: "i" };

    const skip = (Number(page) - 1) * Number(pageSize);
    const [items, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)),
      Ticket.countDocuments(filter)
    ]);

    res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (e) { next(e); }
});

// CREATE
app.post("/tickets", async (req, res, next) => {
  try {
    const { project,title, description = "", priority = "med", steps = [] } = req.body;
    const ticket = await Ticket.create({
      project,
      title, description, priority,
      steps: steps.length ? steps : [
        { title: "Triage" },
        { title: "Reproduce" },
        { title: "Fix & verify" }
      ]
    });
    res.status(201).json(ticket);
  } catch (e) { next(e); }
});

// GET one
app.get("/tickets/:id", async (req, res, next) => {
  try {
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  } catch (e) { next(e); }
});

// UPDATE (partial)
app.patch("/tickets/:id", async (req, res, next) => {
  try {
    const patch = req.body;
    const t = await Ticket.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  } catch (e) { next(e); }
});

// DELETE
app.delete("/tickets/:id", async (req, res, next) => {
  try {
    const t = await Ticket.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- Steps helpers (optional)
app.post("/tickets/:id/steps", async (req, res, next) => {
  try {
    const { title } = req.body;
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    t.steps.push({ title });
    await t.save();
    res.status(201).json(t);
  } catch (e) { next(e); }
});

app.patch("/tickets/:id/steps/:stepId", async (req, res, next) => {
  try {
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    const s = t.steps.id(req.params.stepId);
    if (!s) return res.status(404).json({ error: "Step not found" });
    Object.assign(s, req.body);
    await t.save();
    res.json(t);
  } catch (e) { next(e); }
});

app.delete("/tickets/:id/steps/:stepId", async (req, res, next) => {
  try {
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    const s = t.steps.id(req.params.stepId);
    if (!s) return res.status(404).json({ error: "Step not found" });
    s.deleteOne();
    await t.save();
    res.json(t);
  } catch (e) { next(e); }
});
// Add a note
app.post("/tickets/:id/notes", async (req, res, next) => {
  try {
    const { body, author = "" } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: "Note body required" });
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    t.notes.push({ body: body.trim(), author });
    await t.save();
    res.status(201).json(t);
  } catch (e) { next(e); }
});

// Update a note (body/author)
app.patch("/tickets/:id/notes/:noteId", async (req, res, next) => {
  try {
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    const n = t.notes.id(req.params.noteId);
    if (!n) return res.status(404).json({ error: "Note not found" });
    if (typeof req.body.body === "string") n.body = req.body.body.trim();
    if (typeof req.body.author === "string") n.author = req.body.author;
    await t.save();
    res.json(t);
  } catch (e) { next(e); }
});

// Delete a note
app.delete("/tickets/:id/notes/:noteId", async (req, res, next) => {
  try {
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: "Not found" });
    const n = t.notes.id(req.params.noteId);
    if (!n) return res.status(404).json({ error: "Note not found" });
    n.deleteOne();
    await t.save();
    res.json(t);
  } catch (e) { next(e); }
});


// --- Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const code = /CORS/.test(err.message) ? 403 : 500;
  res.status(code).json({ error: err.message || "Server error" });
});

// --- Boot
const port = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, { dbName: "ticket_creator" })
  .then(() => {
    app.listen(port, () => console.log(`API on :${port}`));
  })
  .catch(err => {
    console.error("Mongo connect error", err);
    process.exit(1);
  });
