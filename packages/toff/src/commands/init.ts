import fs from "fs/promises";
import { getDb } from "../db/index.js";

const initSql = `
CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  goal TEXT NOT NULL,
  parent_id TEXT,
  continuation_summary TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'success', 'failed')) NOT NULL DEFAULT 'pending',
  docker_snapshot_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES task(id)
);

CREATE TABLE IF NOT EXISTS attempt (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('shell', 'files', 'http', 'llm_call', 'docker', 'custom')),
  action_id TEXT NOT NULL,
  action_description TEXT NOT NULL,
  action_params TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failure')) NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  error_severity TEXT CHECK (error_severity IN ('recoverable', 'fatal')),
  outputs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES task(id)
);
`;

export async function initDb() {
  try {
    const db = getDb();
    db.exec(initSql);
    console.log("Initialized toff database");
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
}
