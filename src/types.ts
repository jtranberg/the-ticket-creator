// src/types.ts
export type TicketStatus = "open" | "in_progress" | "blocked" | "done";
export type StepStatus   = "todo" | "doing" | "done";

export interface Note {
  id?: string;
  body: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Step {
  id: string;
  title: string;
  notes?: string;
  status: StepStatus;
}

export interface Ticket {
  id: string;
  project: string;             // ✅ make sure this exists
  title: string;
  description: string;
  status: TicketStatus;
  priority: "low" | "med" | "high";
  createdAt: string;           // ISO
  assignee?: string;
  steps: Step[];
  notes?: Note[];
}
