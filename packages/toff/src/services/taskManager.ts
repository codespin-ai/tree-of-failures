import { getDb } from "../db/index.js";
import type { DockerServiceAPI } from "./docker.js";
import type { LLMServiceAPI } from "./llm.js";
import type {
  TaskNode,
  Action,
  AttemptResult,
  ActionParams,
} from "../types.js";
import { v4 as uuidv4 } from "uuid";
import type { FileContent } from "libllm";
import { promises as fs } from "fs";
import * as libllm from "libllm";

export type TaskManagerAPI = {
  createTask: (prompt: string, parentId?: string) => Promise<TaskNode>;
  executeAction: (
    task: TaskNode,
    action: Action,
    files: FileContent[]
  ) => Promise<AttemptResult>;
};

export function createTaskManager(
  llmService: LLMServiceAPI,
  dockerService: DockerServiceAPI
): TaskManagerAPI {
  async function createTask(
    prompt: string,
    parentId?: string
  ): Promise<TaskNode> {
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
      ) VALUES (
        @id, @description, @goal, @parentId, @status, @createdAt, @updatedAt
      )
    `
    ).run({
      id: task.id,
      description: task.description,
      goal: task.goal,
      parentId: task.parentId,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    });

    return task;
  }

  async function executeAction(
    task: TaskNode,
    action: Action,
    files: FileContent[]
  ): Promise<AttemptResult> {
    try {
      if (files.length > 0) {
        for (const file of files) {
          await fs.mkdir(file.path.substring(0, file.path.lastIndexOf("/")), {
            recursive: true,
          });
          await fs.writeFile(file.path, file.content, "utf-8");
        }
      }

      switch (action.type) {
        case "shell": {
          const params = action.params as ActionParams["shell"];
          const result = await dockerService.executeCommand(params.command);
          return {
            action,
            status: result.exitCode === 0 ? "success" : "failure",
            outputs: {
              stdout: result.stdout,
              stderr: result.stderr,
            },
          };
        }

        case "files":
          return {
            action,
            status: "success",
            outputs: {
              result: `Created/modified ${files.length} files`,
            },
          };

        case "http": {
          const params = action.params as ActionParams["http"];
          const response = await fetch(params.url, {
            method: params.method,
            body: params.body ? JSON.stringify(params.body) : undefined,
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
          const params = action.params as ActionParams["llm_call"];
          const result = await llmService.completion(
            params.messages,
            undefined,
            params.options
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
          const params = action.params as ActionParams["docker"];
          const result = await dockerService.executeCommand(params.command);
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
          throw new Error(
            `Unsupported action type: ${(action as Action).type}`
          );
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

  return {
    createTask,
    executeAction,
  };
}
