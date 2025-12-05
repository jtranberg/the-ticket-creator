// src/components/TicketForm.tsx (ensure there’s a Project field)
import { useState } from "react";
import type { Ticket } from "../types";

export function TicketForm({ onCreate }: { onCreate: (t: Ticket) => void }) {
  const [project, setProject]   = useState("");
  const [title, setTitle]       = useState("");
  const [priority, setPriority] = useState<"low"|"med"|"high">("med");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!project.trim() || !title.trim()) return;

    const t: Ticket = {
      id: crypto.randomUUID(),
      project: project.trim(),        // ✅ include project
      title: title.trim(),
      description: description.trim(),
      status: "open",
      priority,
      createdAt: new Date().toISOString(),
      steps: [
        { id: crypto.randomUUID(), title: "Triage",     status: "todo" },
        { id: crypto.randomUUID(), title: "Reproduce",  status: "todo" },
        { id: crypto.randomUUID(), title: "Fix & verify", status: "todo" },
      ],
      notes: [],
    };

    onCreate(t);
    setTitle(""); setDescription(""); setPriority("med");
    setProject(""); // optional reset
  }

  return (
    <form onSubmit={submit} className="card form">
      <h2>New Ticket</h2>

      <label>
        Project
        <input
          value={project}
          onChange={e => setProject(e.target.value)}
          placeholder='e.g., "Covercraft", "SkinScan", "In & Out App"'
        />
      </label>

      <label>
        Title
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder='e.g., "Add rate limits to API"'
        />
      </label>

      <label>
        Priority
        <select value={priority} onChange={e=>setPriority(e.target.value as never)}>
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

      <label>
        Description
        <textarea
          rows={3}
          value={description}
          onChange={e=>setDescription(e.target.value)}
          placeholder="Why now? Scope? Impact?"
        />
      </label>

      <button type="submit">Create</button>
    </form>
  );
}
