#!/usr/bin/env node
import { program } from "commander";
import { initDb } from "./commands/init.js";
import { promptCommand } from "./commands/prompt.js";
import { rollbackTask } from "./commands/rollback.js";
import { listTasks } from "./commands/list.js";
import { viewTask } from "./commands/view.js";
import { resumeTask } from "./commands/resume.js";

program.name("toff").description("Tree of Failures CLI");

program.command("init").description("Initialize toff database").action(initDb);

program
  .command("prompt")
  .description("Create a new root task")
  .argument("<prompt>", "Task prompt/description")
  .option("-w, --working-dir <dir>", "Working directory", process.cwd())
  .action((prompt, options) => promptCommand(prompt, options.workingDir));

program
  .command("rollback")
  .description("Rollback to a specific task state")
  .argument("<taskId>", "Task ID to rollback to")
  .action(rollbackTask);

program.command("list").description("List all tasks").action(listTasks);

program
  .command("view")
  .description("View details of a specific task")
  .argument("<taskId>", "Task ID to view")
  .action(viewTask);

program
  .command("resume")
  .description("Resume a specific task")
  .argument("<taskId>", "Task ID to resume")
  .option("-w, --working-dir <dir>", "Working directory", process.cwd())
  .action((taskId, options) => resumeTask(taskId, options.workingDir));

program.parse();
