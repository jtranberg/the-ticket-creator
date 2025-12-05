// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { TicketList } from "./components/TicketList";
import { TicketForm } from "./components/TicketForm";
import { TicketDetail } from "./components/TicketDetail";
import type { Ticket } from "./types";
import { db } from "./api";
import "./styles.css";

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("all"); // stores a normalized value or "all"

  // Build a stable, deduped list of projects: { norm, raw }
  const projects = useMemo(() => {
    const pairs = tickets
      .map(t => ((t.project ?? "").trim()))
      .filter(Boolean)
      .map(raw => ({ raw, norm: raw.toLowerCase() }));

    const byNorm = new Map<string, string>();
    for (const { raw, norm } of pairs) {
      if (!byNorm.has(norm)) byNorm.set(norm, raw); // preserve first-seen display casing
    }

    return Array.from(byNorm.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([norm, raw]) => ({ norm, raw }));
  }, [tickets]);

  // Visible tickets respect normalized filter
  const visibleTickets = useMemo(() => {
    if (projectFilter === "all") return tickets;
    return tickets.filter(
      t => ((t.project ?? "").trim().toLowerCase()) === projectFilter
    );
  }, [tickets, projectFilter]);

  const selected = useMemo(
    () => visibleTickets.find(t => t.id === selectedId) || null,
    [visibleTickets, selectedId]
  );

  async function refresh(preserveSelection = true) {
    setLoading(true);
    try {
      const list = await db.list();
      setTickets(list);

      // Keep selection sane within current filter
      if (!preserveSelection) {
        setSelectedId(list[0]?.id ?? null);
      } else if (selectedId && !list.some(t => t.id === selectedId)) {
        const first = (projectFilter === "all"
          ? list
          : list.filter(t => ((t.project ?? "").trim().toLowerCase()) === projectFilter))[0];
        setSelectedId(first?.id ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(false); /* eslint-disable-line */ }, []);

  // If filter changes and current selection is outside view, pick first visible
  useEffect(() => {
    if (selected && projectFilter !== "all" &&
        ((selected.project ?? "").trim().toLowerCase()) !== projectFilter) {
      const first = visibleTickets[0];
      setSelectedId(first?.id ?? null);
    } else if (!selected && visibleTickets.length) {
      setSelectedId(visibleTickets[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, visibleTickets.length]);

  async function onCreate(t: Ticket) {
    const created = await db.create(t);
    const createdNorm = ((created.project ?? "").trim().toLowerCase()) || "all";
    setProjectFilter(createdNorm);
    await refresh(true);
    setSelectedId(created.id);
  }

  async function onUpdate(id: string, patch: Partial<Ticket>) {
    const updated = await db.update(id, patch);
    if (patch.project) {
      const norm = patch.project.trim().toLowerCase();
      if (norm !== projectFilter) setProjectFilter(norm);
    }
    setSelectedId(updated.id);
    await refresh(true);
  }

  async function onDelete(id: string) {
    await db.remove(id);
    await refresh(false);
  }

  return (
    <div className="app">
      <h1 className="app-title">Ticket Creator</h1>

      <TicketForm onCreate={onCreate} />

      {/* Project filter */}
      <div className="card project-filter" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <strong>Project</strong>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ maxWidth: 260 }}
        >
          <option value="all">All projects</option>
          {projects.map(({ norm, raw }, idx) => (
            <option key={`proj-${norm}-${idx}`} value={norm}>{raw}</option>
          ))}
        </select>
      </div>

      <div className="ticket-list">
        <TicketList
          tickets={visibleTickets}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={onDelete}
        />
      </div>

      <div className="detail-wrap">
        {loading ? (
          <div className="placeholder">Loading…</div>
        ) : selected ? (
          <TicketDetail ticket={selected} onUpdate={onUpdate} />
        ) : (
          <div className="placeholder">
            {projectFilter === "all"
              ? "Select or create a ticket to get started."
              : "No tickets in this project yet — create one above."}
          </div>
        )}
      </div>
    </div>
  );
}
