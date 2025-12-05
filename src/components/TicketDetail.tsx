import { useEffect, useState } from "react";
import type { Ticket, Note } from "../types";
import { db } from "../api";

export function TicketDetail({
  ticket,
  onUpdate,
}: {
  ticket: Ticket;
  onUpdate: (id: string, patch: Partial<Ticket>) => void;
}) {
  const [local, setLocal] = useState<Ticket>(ticket);
  const [noteBody, setNoteBody] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ sync local when a different ticket is selected
  useEffect(() => {
    setLocal(ticket);
    setError(null);
    setNoteBody("");
    setNoteAuthor("");
  }, [ticket.id, ticket]);

  function update<K extends keyof Ticket>(key: K, value: Ticket[K]) {
    const next = { ...local, [key]: value };
    setLocal(next);
    onUpdate(ticket.id, { [key]: value } as Partial<Ticket>);
  }

  // --- Notes handlers
  async function addNote() {
    const body = noteBody.trim();
    if (!body) return;
    setSavingNote(true);
    setError(null);
    try {
      const updated = await db.addNote(ticket.id, {
        body,
        author: noteAuthor.trim(),
      });
      setLocal(updated);                    // refresh detail from server
      onUpdate(ticket.id, { notes: updated.notes });
      setNoteBody("");
      // keep author for next note
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteNote(noteId: string) {
    setError(null);
    try {
      const updated = await db.removeNote(ticket.id, noteId);
      setLocal(updated);
      onUpdate(ticket.id, { notes: updated.notes });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Failed to delete note");
    }
  }

  return (
    <div className="card detail">
      {/* Header: Title + Project badge */}
      <div className="row space" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{local.title}</h2>
        {local.project && <span className="pill">{local.project}</span>}
      </div>

      {/* Quick meta */}
      <div className="muted" style={{ marginBottom: 8 }}>
        Status: {local.status} • Priority: {local.priority}
      </div>

      {/* Editable project */}
      <label>
        Project
        <input
          value={local.project || ""}
          onChange={(e) => update("project", e.target.value)}
          placeholder='e.g., "Covercraft", "SkinScan", "In & Out App"'
        />
      </label>

      {/* Description */}
      <label>
        Description
        <textarea
          rows={4}
          value={local.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Describe the problem, context, and desired outcome…"
        />
      </label>

      {/* --- Notes --- */}
      <h3>Notes</h3>
      {error && (
        <div className="card" style={{ borderColor: "#3d1a23", color: "#ffb0b0" }}>
          {error}
        </div>
      )}

      <div className="notes">
        <div className="note-new">
          <input
            placeholder="Your name (optional)"
            value={noteAuthor}
            onChange={(e) => setNoteAuthor(e.target.value)}
          />
        </div>
        <div className="note-new">
          <textarea
            rows={3}
            placeholder="Add a note about progress, decisions, blockers…"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button
            onClick={addNote}
            disabled={savingNote || noteBody.trim().length === 0}
            title={noteBody.trim().length === 0 ? "Write a note first" : ""}
          >
            {savingNote ? "Adding…" : "Add note"}
          </button>
        </div>

        <ul className="note-list">
          {(local.notes ?? []).slice().reverse().map((n: Note) => (
            <li key={n.id} className="note-item">
              <div className="row">
                <strong>{n.author || "Note"}</strong>
                <span className="muted">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </span>
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
              <button className="danger small" onClick={() => deleteNote(n.id!)}>
                Delete
              </button>
            </li>
          ))}
          {(!local.notes || local.notes.length === 0) && (
            <li className="muted">No notes yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
