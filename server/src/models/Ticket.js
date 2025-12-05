// models/Ticket.js
import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  { body: { type: String, required: true }, author: { type: String, default: "" } },
  { _id: true, timestamps: true }
);

const StepSchema = new mongoose.Schema(
  { id: { type: String }, title: String, notes: String, status: { type: String, default: "todo" } },
  { _id: true }
);

const TicketSchema = new mongoose.Schema(
  {
    project: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["open","in_progress","blocked","done"], default: "open" },
    priority: { type: String, enum: ["low","med","high"], default: "med" },
    assignee: { type: String, default: "" },
    steps: { type: [StepSchema], default: [] },
    notes: { type: [NoteSchema], default: [] },
  },
  { timestamps: true, versionKey: "__v" }
);

// Map _id → id recursively for top-level + subdocs
TicketSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString?.() ?? ret._id;
    delete ret._id;
    delete ret.__v;

    if (Array.isArray(ret.steps)) {
      ret.steps = ret.steps.map(s => {
        const id = s._id?.toString?.() ?? s._id;
        const { _id, ...rest } = s;
        return { id, ...rest };
      });
    }
    if (Array.isArray(ret.notes)) {
      ret.notes = ret.notes.map(n => {
        const id = n._id?.toString?.() ?? n._id;
        const { _id, ...rest } = n;
        return { id, ...rest };
      });
    }
    return ret;
  }
});

export const Ticket = mongoose.model("Ticket", TicketSchema);
