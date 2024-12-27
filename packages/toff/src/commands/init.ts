import { promises as fs } from "fs";
import path from "path";
import { pathExists } from "../fs/pathExists.js";
import { getDb } from "../db/index.js";

const DEFAULT_TOFF_CONFIG = {
  version: "0.1.0",
  task: {
    maxAttempts: 10,
    maxDepth: 5,
    defaultTimeout: 30000,
  },
  llm: {
    defaultModel: "claude-3-sonnet",
    planningModel: "claude-3-opus",
    errorModel: "claude-3-sonnet",
    models: [
      {
        name: "claude-3-opus",
        provider: "anthropic",
        maxOutputTokens: 16384,
      },
      {
        name: "claude-3-sonnet",
        provider: "anthropic",
        maxOutputTokens: 8192,
      },
      {
        name: "gpt-4",
        provider: "openai",
        maxOutputTokens: 4096,
      },
    ],
    maxTokens: 8192,
    temperature: {
      planning: 0.7,
      execution: 0.5,
      error: 0.3,
    },
  },
  docker: {
    snapshotFrequency: "action",
    keepSnapshots: 5,
    resourceLimits: {
      memory: "2gb",
      cpu: 2,
    },
  },
  system: {
    logging: {
      level: "info",
      file: true,
    },
    fileOps: {
      maxSize: 10485760, // 10MB
      allowedPaths: ["/etc", "/var/lib", "/opt"],
    },
    http: {
      timeout: 30000,
      maxRetries: 3,
    },
  },
};

const DEFAULT_OPENAI_CONFIG = {
  apiKey: "your-api-key",
};

const DEFAULT_ANTHROPIC_CONFIG = {
  apiKey: "your-api-key",
};

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

export type InitArgs = {
  dirname: string;
  force?: boolean;
  debug?: boolean;
};

export async function init(args: InitArgs): Promise<void> {
  try {
    const fullPath = path.resolve(args.dirname);
    await fs.mkdir(fullPath, { recursive: true });

    const configDir = path.join(fullPath, ".toff");
    const configFile = path.join(configDir, "toff.json");
    const openaiConfigFile = path.join(configDir, "openai.json");
    const anthropicConfigFile = path.join(configDir, "anthropic.json");

    // Check if .toff already exists
    if (!args.force && (await pathExists(configDir))) {
      throw new Error(`${configDir} already exists. Use --force to overwrite`);
    }

    // Create the config dir
    await fs.mkdir(configDir, { recursive: true });

    // Write the config files
    await fs.writeFile(
      configFile,
      JSON.stringify(DEFAULT_TOFF_CONFIG, null, 2)
    );

    await fs.writeFile(
      openaiConfigFile,
      JSON.stringify(DEFAULT_OPENAI_CONFIG, null, 2)
    );

    await fs.writeFile(
      anthropicConfigFile,
      JSON.stringify(DEFAULT_ANTHROPIC_CONFIG, null, 2)
    );

    // Initialize database
    const db = getDb();
    db.exec(initSql);

    console.log(`Initialized toff in ${fullPath}`);
  } catch (err) {
    console.error("Failed to initialize:", err);
    process.exit(1);
  }
}
