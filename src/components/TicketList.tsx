// src/components/TicketList.tsx
import type { Ticket } from "../types";

export function TicketList({
  tickets, selectedId, onSelect, onDelete
}: {
  tickets: Ticket[]; selectedId: string|null;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="card">
      <h2>Tickets</h2>
      <ul className="list">
        {tickets.map(t => (
          <li
            key={t.id}
            className={t.id === selectedId ? "selected" : ""}
            onClick={() => onSelect(t.id)}
          >
            <div className="row">
              <strong>{t.title}</strong>
              <span className={`pill ${t.priority}`}>{t.priority}</span>
            </div>

            {/* NEW: show project name */}
            <div className="muted" style={{ fontSize: 12 }}>
              {t.project || "No project"}
            </div>

            <div className="muted">
              {new Date(t.createdAt).toLocaleString()} • {t.status}
            </div>

            <button
              className="danger small"
              onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
