// src/api.ts
import type { Ticket } from "./types";

const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:5000";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return res.json();
}


/** If T has `_id`, return T without `_id` plus `id: string`; otherwise return T unchanged. */
type ReplaceMongoId<T> = T extends { _id: unknown }
  ? Omit<T, "_id"> & { id: string }
  : T;

function normalizeId<T extends object>(doc: T): ReplaceMongoId<T> {
  if (!doc) return doc as ReplaceMongoId<T>;

  // Has a Mongo _id?
  const hasId =
    typeof (doc as { _id?: unknown })._id !== "undefined" &&
    (doc as { _id?: unknown })._id !== null;

  if (hasId) {
    // Build id string safely
    const raw = (doc as { _id: unknown })._id;
    const id = typeof raw === "string" ? raw : String(raw);

    // Remove _id without binding it (no unused-vars):
    const entries = Object.entries(doc as unknown as Record<string, unknown>)
      .filter(([k]) => k !== "_id");

    const rest = Object.fromEntries(entries) as Omit<T & { _id?: unknown }, "_id">;

    // Return new shape (intentional cast via unknown)
    return ({ id, ...rest } as unknown) as ReplaceMongoId<T>;
  }

  return doc as ReplaceMongoId<T>;
}



type ListParams = {
  q?: string;
  status?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
};

export const db = {
  // LIST with optional filters
  async list(params: ListParams = {}): Promise<Ticket[]> {
    const url = new URL(`${BASE}/tickets`);
    if (params.q) url.searchParams.set("q", params.q);
    if (params.status) url.searchParams.set("status", params.status);
    if (params.priority) url.searchParams.set("priority", params.priority);
    if (params.page) url.searchParams.set("page", String(params.page));
    if (params.pageSize) url.searchParams.set("pageSize", String(params.pageSize));

    const data = await asJson<{ items: Ticket[] }>(await fetch(url));
    return (data.items || []).map(t => normalizeId<Ticket>(t));
  },

  async get(id: string): Promise<Ticket | undefined> {
    const t = await asJson<Ticket>(await fetch(`${BASE}/tickets/${id}`));
    return normalizeId<Ticket>(t);
  },

 async create(t: Ticket): Promise<Ticket> {
  const res = await fetch(`${BASE}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: t.project,   // 👈 added
      title: t.title,
      description: t.description,
      priority: t.priority,
      steps: t.steps
    }),
  });
  return normalizeId(await asJson<Ticket>(res));
},

  async update(id: string, patch: Partial<Ticket>): Promise<Ticket> {
    const res = await fetch(`${BASE}/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return normalizeId<Ticket>(await asJson<Ticket>(res));
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${BASE}/tickets/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
  },

  // ---- Notes API ----
  async addNote(ticketId: string, note: { body: string; author?: string }) {
    const res = await fetch(`${BASE}/tickets/${ticketId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });
    return normalizeId<Ticket>(await asJson<Ticket>(res));
  },

  async updateNote(
    ticketId: string,
    noteId: string,
    patch: { body?: string; author?: string }
  ) {
    const res = await fetch(`${BASE}/tickets/${ticketId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return normalizeId<Ticket>(await asJson<Ticket>(res));
  },

  async removeNote(ticketId: string, noteId: string) {
    const res = await fetch(`${BASE}/tickets/${ticketId}/notes/${noteId}`, {
      method: "DELETE",
    });
    return normalizeId<Ticket>(await asJson<Ticket>(res));
  },
};
