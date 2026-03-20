const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let tasks = [];

app.get("/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/tasks", (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: "Title required" });
  }

  const task = {
    id: Date.now(),
    title: req.body.title,
    description: req.body.description || "",
    status: "todo",
    created_at: new Date()
  };

  tasks.push(task);
  res.json(task);
});

app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  tasks = tasks.map(t => t.id === id ? { ...t, ...req.body } : t);
  res.json({ success: true });
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  tasks = tasks.filter(t => t.id !== id);
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});