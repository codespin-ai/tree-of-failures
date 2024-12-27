#!/usr/bin/env node
import yargs from "yargs";
import type { ArgumentsCamelCase } from "yargs";
import { promptCommand } from "./commands/prompt.js";
import { rollbackTask } from "./commands/rollback.js";
import { listTasks } from "./commands/list.js";
import { viewTask } from "./commands/view.js";
import { resumeTask } from "./commands/resume.js";
import { init } from "./commands/init.js";

type InitOptions = {
  dirname: string;
  force?: boolean;
  debug?: boolean;
};

type PromptOptions = {
  prompt: string;
  workingDir: string;
  model?: string;
  maxAttempts?: number;
  debug?: boolean;
  maxTokens?: number;
  config?: string;
  timeout?: number;
  snapshotFrequency?: "never" | "action" | "task";
};

type RollbackOptions = {
  taskId: string;
  force?: boolean;
  debug?: boolean;
};

type ViewOptions = {
  taskId: string;
  debug?: boolean;
};

type ListOptions = {
  limit?: number;
  status?: "pending" | "in_progress" | "success" | "failed";
  debug?: boolean;
};

type ResumeOptions = {
  taskId: string;
  workingDir: string;
  model?: string;
  maxAttempts?: number;
  debug?: boolean;
  maxTokens?: number;
  config?: string;
  timeout?: number;
};

async function main() {
  await yargs(process.argv.slice(2))
    .command<InitOptions>(
      "init <dirname>",
      "Initialize toff database",
      (yargs) => {
        return yargs
          .positional("dirname", {
            type: "string",
            demandOption: true,
            description: "Directory to initialize the database in",
          })
          .option("force", {
            type: "boolean",
            default: false,
            alias: "f",
            description: "Force overwrite existing configuration",
          })
          .option("debug", {
            type: "boolean",
            description: "Enable debug mode",
          });
      },
      async (argv: ArgumentsCamelCase<InitOptions>) => {
        await init(argv);
      }
    )
    .command<PromptOptions>(
      "prompt <prompt>",
      "Create a new root task",
      (yargs) => {
        return yargs
          .positional("prompt", {
            type: "string",
            demandOption: true,
            description: "Task prompt/description",
          })
          .option("working-dir", {
            alias: "w",
            type: "string",
            default: process.cwd(),
            description: "Working directory",
          })
          .option("model", {
            type: "string",
            description: "Name of the model to use (e.g., 'claude-3-opus')",
          })
          .option("max-attempts", {
            type: "number",
            description: "Maximum number of attempts per task",
          })
          .option("debug", {
            type: "boolean",
            description: "Enable debug mode",
          })
          .option("max-tokens", {
            type: "number",
            description: "Maximum number of tokens for LLM calls",
          })
          .option("config", {
            type: "string",
            alias: "c",
            description: "Path to config directory (.toff)",
          })
          .option("timeout", {
            type: "number",
            description: "Timeout for actions in milliseconds",
          })
          .option("snapshot-frequency", {
            type: "string",
            choices: ["never", "action", "task"],
            description: "When to take Docker snapshots",
          });
      },
      async (argv: ArgumentsCamelCase<PromptOptions>) => {
        await promptCommand(argv.prompt, argv.workingDir);
      }
    )
    .command<RollbackOptions>(
      "rollback <taskId>",
      "Rollback to a specific task state",
      (yargs) => {
        return yargs
          .positional("taskId", {
            type: "string",
            demandOption: true,
            description: "Task ID to rollback to",
          })
          .option("force", {
            type: "boolean",
            default: false,
            alias: "f",
            description: "Force rollback without confirmation",
          })
          .option("debug", {
            type: "boolean",
            description: "Enable debug mode",
          });
      },
      async (argv: ArgumentsCamelCase<RollbackOptions>) => {
        await rollbackTask(argv.taskId);
      }
    )
    .command<ListOptions>(
      "list",
      "List all tasks",
      (yargs) => {
        return yargs
          .option("limit", {
            type: "number",
            alias: "n",
            description: "Limit the number of tasks shown",
          })
          .option("status", {
            type: "string",
            choices: ["pending", "in_progress", "success", "failed"],
            description: "Filter tasks by status",
          })
          .option("debug", {
            type: "boolean",
            description: "Enable debug mode",
          });
      },
      async (argv: ArgumentsCamelCase<ListOptions>) => {
        await listTasks();
      }
    )
    .command<ViewOptions>(
      "view <taskId>",
      "View details of a specific task",
      (yargs) => {
        return yargs
          .positional("taskId", {
            type: "string",
            demandOption: true,
            description: "Task ID to view",
          })
          .option("debug", {
            type: "boolean",
            description: "Enable debug mode",
          });
      },
      async (argv: ArgumentsCamelCase<ViewOptions>) => {
        await viewTask(argv.taskId);
      }
    )
    .command<ResumeOptions>(
      "resume <taskId>",
      "Resume a specific task",
      (yargs) => {
        return yargs
          .positional("taskId", {
            type: "string",
            demandOption: true,
            description: "Task ID to resume",
          })
          .option("working-dir", {
            alias: "w",
            type: "string",
            default: process.cwd(),
            description: "Working directory",
          })
          .option("model", {
            type: "string",
            description: "Name of the model to use (e.g., 'claude-3-opus')",
          })
          .option("max-attempts", {
            type: "number",
            description: "Maximum number of attempts per task",
          })
          .option("debug", {
            type: "boolean",
            description: "Enable debug mode",
          })
          .option("max-tokens", {
            type: "number",
            description: "Maximum number of tokens for LLM calls",
          })
          .option("config", {
            type: "string",
            alias: "c",
            description: "Path to config directory (.toff)",
          })
          .option("timeout", {
            type: "number",
            description: "Timeout for actions in milliseconds",
          });
      },
      async (argv: ArgumentsCamelCase<ResumeOptions>) => {
        await resumeTask(argv.taskId, argv.workingDir);
      }
    )
    .version()
    .strict()
    .help()
    .alias("h", "help").argv;
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
