import { useState, useEffect, useRef } from "react";

// tiny uuid replacement - good enough for our purposes
const uid = () => Math.random().toString(36).slice(2, 10);

const STATUSES = ["todo", "in_progress", "done"];

const STATUS_LABEL = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_COLOR = {
  todo: "#e2b96f",
  in_progress: "#6fa8e2",
  done: "#72d4a0",
};

// mock "backend" - just functions that operate on an array
// in a real app these would be fetch() calls


let _tasks = [
  { id: uid(), title: "Sample Task", description: "Demo", status: "todo", created_at: new Date().toISOString() }
];

const api = {
  getTasks: () => Promise.resolve([..._tasks]),

  createTask: (data) => {
    if (!data.title?.trim()) return Promise.reject(new Error("Title cannot be empty"));
    const t = {
      id: uid(),
      title: data.title,
      description: data.description || "",
      status: "todo",
      created_at: new Date().toISOString(),
    };
    _tasks = [t, ..._tasks];
    return Promise.resolve(t);
  },

  updateTask: (id, data) => {
    _tasks = _tasks.map(t => t.id === id ? { ...t, ...data } : t);
    return Promise.resolve(_tasks.find(t => t.id === id));
  },

  deleteTask: (id) => {
    _tasks = _tasks.filter(t => t.id !== id);
    return Promise.resolve({ ok: true });
  },
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(task.id);
  };

  return (
    <div
      className={`task-card ${deleting ? "fade-out" : ""}`}
      style={{ "--accent": STATUS_COLOR[task.status] }}
    >
      <div className="task-card-top">
        <span className="status-pill" style={{ background: STATUS_COLOR[task.status] }}>
          {STATUS_LABEL[task.status]}
        </span>
        <span className="task-date">{formatDate(task.created_at)}</span>
      </div>
      <h3 className={`task-title ${task.status === "done" ? "done-title" : ""}`}>{task.title}</h3>
      {task.description && <p className="task-desc">{task.description}</p>}
      <div className="task-actions">
        <button
          className="btn-toggle"
          onClick={() => onToggle(task)}
          title="Cycle status"
        >
          {task.status === "done" ? "↩ Reopen" : task.status === "todo" ? "▶ Start" : "✓ Done"}
        </button>
        <button className="btn-edit" onClick={() => onEdit(task)} title="Edit">✎</button>
        <button className="btn-del" onClick={handleDelete} title="Delete">✕</button>
      </div>
    </div>
  );
}

function AddTaskModal({ onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    setErr("");
    if (!title.trim()) { setErr("Title can't be empty!"); return; }
    setLoading(true);
    try {
      await onAdd({ title, description: desc });
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">New Task</h2>
        {err && <div className="modal-err">{err}</div>}
        <label className="modal-label">Title *</label>
        <input
          ref={inputRef}
          className="modal-input"
          placeholder="e.g. Implement auth middleware"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
        />
        <label className="modal-label">Description</label>
        <textarea
          className="modal-input modal-textarea"
          placeholder="Optional details..."
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={3}
        />
        <div className="modal-btns">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Adding..." : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ task, onClose, onSave }) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!title.trim()) { setErr("Title can't be empty!"); return; }
    await onSave(task.id, { title: title.trim(), description: desc, status });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Edit Task</h2>
        {err && <div className="modal-err">{err}</div>}
        <label className="modal-label">Title *</label>
        <input className="modal-input" value={title} onChange={e => setTitle(e.target.value)} />
        <label className="modal-label">Description</label>
        <textarea className="modal-input modal-textarea" value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
        <label className="modal-label">Status</label>
        <select className="modal-input" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <div className="modal-btns">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getTasks().then(ts => { setTasks(ts); setLoading(false); });
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async (data) => {
    const t = await api.createTask(data);
    setTasks(prev => [t, ...prev]);
    notify("Task added ✓");
  };

  const handleToggle = async (task) => {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    const updated = await api.updateTask(task.id, { status: next });
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDelete = async (id) => {
    await api.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    notify("Task deleted");
  };

  const handleEdit = async (id, data) => {
    const updated = await api.updateTask(id, data);
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    notify("Task updated ✓");
  };

  const visible = tasks.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { all: tasks.length, ...Object.fromEntries(STATUSES.map(s => [s, tasks.filter(t => t.status === s).length])) };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Syne', sans-serif;
          background: #0f0f11;
          color: #e8e8e0;
          min-height: 100vh;
        }

        .app {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }

        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 36px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left h1 {
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -1px;
          line-height: 1;
          color: #f0ede6;
        }

        .header-left h1 span {
          color: #c8f566;
        }

        .header-left p {
          font-size: 0.85rem;
          color: #6b6b70;
          margin-top: 6px;
          font-family: 'DM Mono', monospace;
        }

        .btn-new {
          background: #c8f566;
          color: #0f0f11;
          border: none;
          padding: 10px 22px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.1s, background 0.15s;
          letter-spacing: 0.02em;
        }

        .btn-new:hover { background: #d9ff7a; transform: translateY(-1px); }
        .btn-new:active { transform: translateY(0); }

        .controls {
          display: flex;
          gap: 12px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 180px;
          background: #1a1a1f;
          border: 1px solid #2a2a30;
          border-radius: 6px;
          padding: 9px 14px;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          color: #e8e8e0;
          outline: none;
          transition: border-color 0.15s;
        }

        .search-box:focus { border-color: #c8f566; }
        .search-box::placeholder { color: #44444c; }

        .filter-tabs {
          display: flex;
          gap: 4px;
          background: #1a1a1f;
          border-radius: 6px;
          padding: 4px;
          border: 1px solid #2a2a30;
        }

        .filter-tab {
          background: none;
          border: none;
          color: #6b6b70;
          font-family: 'Syne', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .filter-tab.active {
          background: #2a2a30;
          color: #e8e8e0;
        }

        .filter-tab .count {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          margin-left: 4px;
          color: #c8f566;
        }

        .stats-row {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .stat-card {
          flex: 1;
          min-width: 100px;
          background: #1a1a1f;
          border: 1px solid #2a2a30;
          border-radius: 8px;
          padding: 14px 16px;
        }

        .stat-card .stat-num {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--col);
          font-family: 'DM Mono', monospace;
          line-height: 1;
        }

        .stat-card .stat-lbl {
          font-size: 0.72rem;
          color: #6b6b70;
          margin-top: 4px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .tasks-grid {
          display: grid;
          gap: 14px;
        }

        .task-card {
          background: #1a1a1f;
          border: 1px solid #2a2a30;
          border-left: 3px solid var(--accent, #6b6b70);
          border-radius: 8px;
          padding: 18px 20px;
          transition: transform 0.15s, border-color 0.15s, opacity 0.3s;
          animation: slideIn 0.25s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .task-card.fade-out {
          opacity: 0;
          transform: translateX(20px);
          pointer-events: none;
        }

        .task-card:hover { transform: translateY(-2px); border-color: #3a3a42; }

        .task-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .status-pill {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          color: #0f0f11;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .task-date {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: #44444c;
        }

        .task-title {
          font-size: 1rem;
          font-weight: 700;
          color: #f0ede6;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .done-title {
          text-decoration: line-through;
          color: #44444c;
        }

        .task-desc {
          font-size: 0.82rem;
          color: #6b6b70;
          margin-bottom: 14px;
          line-height: 1.5;
          font-family: 'DM Mono', monospace;
        }

        .task-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-toggle {
          background: #2a2a30;
          border: 1px solid #3a3a42;
          color: #c8f566;
          font-family: 'Syne', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-toggle:hover { background: #3a3a42; }

        .btn-edit, .btn-del {
          background: none;
          border: 1px solid #2a2a30;
          color: #6b6b70;
          width: 30px;
          height: 30px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .btn-edit:hover { border-color: #6fa8e2; color: #6fa8e2; }
        .btn-del:hover { border-color: #e26f6f; color: #e26f6f; }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #44444c;
        }

        .empty-state .icon { font-size: 2.5rem; margin-bottom: 12px; }
        .empty-state p { font-size: 0.9rem; }

        .loading { text-align: center; padding: 60px; color: #44444c; font-family: 'DM Mono', monospace; font-size: 0.85rem; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
          animation: fadein 0.15s ease;
        }

        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: #1a1a1f;
          border: 1px solid #2a2a30;
          border-radius: 12px;
          padding: 28px;
          width: 100%;
          max-width: 440px;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #f0ede6;
          margin-bottom: 20px;
          letter-spacing: -0.5px;
        }

        .modal-err {
          background: #2d1515;
          border: 1px solid #5a2020;
          color: #e28080;
          font-size: 0.82rem;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-family: 'DM Mono', monospace;
        }

        .modal-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b6b70;
          display: block;
          margin-bottom: 6px;
        }

        .modal-input {
          width: 100%;
          background: #0f0f11;
          border: 1px solid #2a2a30;
          border-radius: 6px;
          padding: 9px 12px;
          color: #e8e8e0;
          font-family: 'DM Mono', monospace;
          font-size: 0.88rem;
          margin-bottom: 16px;
          outline: none;
          transition: border-color 0.15s;
        }

        .modal-input:focus { border-color: #c8f566; }
        .modal-textarea { resize: vertical; }
        select.modal-input { appearance: none; }

        .modal-btns {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 4px;
        }

        .btn-cancel {
          background: none;
          border: 1px solid #2a2a30;
          color: #6b6b70;
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-cancel:hover { border-color: #3a3a42; color: #e8e8e0; }

        .btn-primary {
          background: #c8f566;
          color: #0f0f11;
          border: none;
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-primary:hover:not(:disabled) { background: #d9ff7a; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #c8f566;
          color: #0f0f11;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 10px 20px;
          border-radius: 6px;
          z-index: 200;
          animation: toastIn 0.2s ease;
          pointer-events: none;
        }

        @keyframes toastIn {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="header-left">
            <h1>task<span>board</span></h1>
            <p>// REST API + UI — simple task manager</p>
          </div>
          <button className="btn-new" onClick={() => setShowAdd(true)}>+ New Task</button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          {[["all", "#f0ede6", "Total"], ["todo", STATUS_COLOR.todo, "To Do"], ["in_progress", STATUS_COLOR.in_progress, "In Progress"], ["done", STATUS_COLOR.done, "Done"]].map(([key, col, lbl]) => (
            <div className="stat-card" key={key} style={{ "--col": col }}>
              <div className="stat-num">{counts[key] ?? 0}</div>
              <div className="stat-lbl">{lbl}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="controls">
          <input
            className="search-box"
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-tabs">
            {["all", ...STATUSES].map(s => (
              <button
                key={s}
                className={`filter-tab ${filter === s ? "active" : ""}`}
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "All" : STATUS_LABEL[s]}
                <span className="count">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks */}
        {loading ? (
          <div className="loading">loading tasks...</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>{search ? "No tasks match your search." : "No tasks here. Add one!"}</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {visible.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={setEditTask}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {editTask && <EditModal task={editTask} onClose={() => setEditTask(null)} onSave={handleEdit} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
