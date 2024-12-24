import { getDb } from "../db/index.js";
import { DockerService } from "./docker.js";
import { LLMService } from "./llm.js";
import type { TaskNode, Action, AttemptResult, SourceFile } from "../types.js";
import { v4 as uuidv4 } from "uuid";

export class TaskManager {
  constructor(
    private llmService: LLMService,
    private dockerService: DockerService
  ) {}

  private async handleFileOperation(file: SourceFile): Promise<void> {
    const escapedContent = file.content.replace(/'/g, "'\\''");
    await this.dockerService.executeCommand(
      `mkdir -p $(dirname '${file.path}') && echo '${escapedContent}' > '${file.path}'`
    );
  }

  async executeAction(
    task: TaskNode,
    action: Action,
    files: SourceFile[]
  ): Promise<AttemptResult> {
    try {
      // First handle any file operations
      if (files.length > 0) {
        for (const file of files) {
          await this.handleFileOperation(file);
        }
      }

      // Then execute the main action based on its type
      switch (action.type) {
        case "shell":
          const result = await this.dockerService.executeCommand(
            action.params.command as string
          );
          return {
            action,
            status: result.exitCode === 0 ? "success" : "failure",
            outputs: {
              stdout: result.stdout,
              stderr: result.stderr,
            },
          };

        case "files":
          return {
            action,
            status: "success",
            outputs: {
              result: `Created/modified ${files.length} files`,
            },
          };

        case "http": {
          const { url, method, body } = action.params as {
            url: string;
            method: string;
            body?: any;
          };
          const response = await fetch(url, {
            method,
            body: body ? JSON.stringify(body) : undefined,
            headers: {
              "Content-Type": "application/json",
            },
          });

          const responseData = await response.text();
          return {
            action,
            status: response.ok ? "success" : "failure",
            outputs: {
              result: responseData,
            },
          };
        }

        case "llm_call": {
          const result = await this.llmService.completion(
            action.params.messages,
            undefined,
            action.params.options,
            process.cwd()
          );
          return {
            action,
            status: "success",
            outputs: {
              result: result.message,
            },
          };
        }

        case "docker": {
          const result = await this.dockerService.executeCommand(
            action.params.command as string
          );
          return {
            action,
            status: result.exitCode === 0 ? "success" : "failure",
            outputs: {
              stdout: result.stdout,
              stderr: result.stderr,
            },
          };
        }

        case "custom":
          throw new Error("Custom actions not yet implemented");

        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }
    } catch (error: any) {
      return {
        action,
        status: "failure",
        error: {
          code: "EXECUTION_ERROR",
          message: error.message,
          severity: "recoverable",
        },
      };
    }
  }

  async createTask(prompt: string, parentId?: string): Promise<TaskNode> {
    const taskId = `task_${uuidv4()}`;
    const task: TaskNode = {
      id: taskId,
      description: prompt,
      goal: prompt,
      parentId,
      status: "pending",
      attempts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = getDb();
    db.prepare(
      `
      INSERT INTO task (
        id, description, goal, parent_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      task.id,
      task.description,
      task.goal,
      task.parentId,
      task.status,
      task.createdAt.toISOString(),
      task.updatedAt.toISOString()
    );

    return task;
  }

  async processTask(task: TaskNode): Promise<TaskNode> {
    const systemContext = await this.dockerService.getSystemContext();

    try {
      while (task.status === "pending" || task.status === "in_progress") {
        const { action, files } = await this.llmService.getNextAction(
          task,
          systemContext
        );
        const result = await this.executeAction(task, action, files);

        task.attempts.push(result);
        task.status = "in_progress";

        if (result.status === "failure") {
          if (result.error?.severity === "fatal") {
            task.status = "failed";
          } else {
            const { action: nextAction, files: nextFiles } =
              await this.llmService.handleError(
                task,
                result.error,
                systemContext
              );
            const recoveryResult = await this.executeAction(
              task,
              nextAction,
              nextFiles
            );
            task.attempts.push(recoveryResult);

            if (recoveryResult.status === "failure") {
              task.status = "failed";
            }
          }
        }

        if (
          task.attempts.length > 0 &&
          task.attempts[task.attempts.length - 1].status === "success"
        ) {
          const continuationSummary =
            await this.llmService.getContinuationSummary(task, systemContext);
          task.continuationSummary = continuationSummary;
        }

        // Update task in database
        const db = getDb();
        db.prepare(
          `
          UPDATE task 
          SET status = ?, 
              continuation_summary = ?,
              updated_at = ? 
          WHERE id = ?
        `
        ).run(
          task.status,
          task.continuationSummary,
          new Date().toISOString(),
          task.id
        );
      }

      return task;
    } catch (error) {
      console.error("Task processing failed:", error);
      task.status = "failed";
      // Update task status in database
      const db = getDb();
      db.prepare(
        `
        UPDATE task 
        SET status = ?, updated_at = ? 
        WHERE id = ?
      `
      ).run(task.status, new Date().toISOString(), task.id);

      throw error;
    }
  }
}
