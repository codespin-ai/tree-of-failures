#!/usr/bin/env node
import { program } from "commander";
import { initDb } from "./commands/init.js";
import { createTask } from "./commands/prompt.js";
import { rollbackTask } from "./commands/rollback.js";

program.name("toff").description("Tree of Failures CLI");

program.command("init").description("Initialize toff database").action(initDb);

program
  .command("prompt")
  .description("Create a new root task")
  .argument("<prompt>", "Task prompt/description")
  .action(createTask);

program
  .command("rollback")
  .description("Rollback to a specific task state")
  .argument("<taskId>", "Task ID to rollback to")
  .action(rollbackTask);

program.parse();
