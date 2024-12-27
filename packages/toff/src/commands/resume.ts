import { getDb } from "../db/index.js";
import { getAPI } from "libllm";
import { getLoggers } from "../console.js";
import { createDockerService } from "../services/docker.js";
import { createLLMService } from "../services/llm.js";
import { getLLMConfigLoaders } from "../settings/getLLMConfigLoaders.js";
import type { TaskNode, ActionType } from "../types.js";
import { processTask } from "../tasks/processTask.js";

type TaskRow = {
  id: string;
  description: string;
  goal: string;
  parent_id: string | null;
  status: string;
  continuation_summary: string | null;
  docker_snapshot_id: string | null;
  created_at: string;
  updated_at: string;
};

type AttemptRow = {
  action_id: string;
  action_type: string;
  action_description: string;
  action_params: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  error_severity: string | null;
  outputs: string | null;
};

function validateActionType(type: string): ActionType {
  const validTypes = ["shell", "files", "http", "llm_call", "docker", "custom"];
  if (validTypes.includes(type)) {
    return type as ActionType;
  }
  throw new Error(`Invalid action type: ${type}`);
}

export async function resumeTask(taskId: string, workingDir: string) {
  try {
    const db = getDb();

    // Get task details
    const taskData = db
      .prepare(
        `
      SELECT * FROM task WHERE id = ?
    `
      )
      .get(taskId) as TaskRow;

    if (!taskData) {
      console.error(`Task ${taskId} not found`);
      process.exit(1);
    }

    // Get attempts
    const attempts = db
      .prepare(
        `
      SELECT * FROM attempt WHERE task_id = ? ORDER BY created_at ASC
    `
      )
      .all(taskId) as AttemptRow[];

    // Reconstruct TaskNode
    const task: TaskNode = {
      id: taskData.id,
      description: taskData.description,
      goal: taskData.goal,
      parentId: taskData.parent_id || undefined,
      status: taskData.status as TaskNode["status"],
      continuationSummary: taskData.continuation_summary || undefined,
      dockerSnapshotId: taskData.docker_snapshot_id || undefined,
      attempts: attempts.map((a) => ({
        action: {
          id: a.action_id,
          type: validateActionType(a.action_type),
          description: a.action_description,
          params: JSON.parse(a.action_params),
        },
        status: a.status === "success" ? "success" : "failure",
        error: a.error_code
          ? {
              code: a.error_code,
              message: a.error_message!,
              severity: a.error_severity as "fatal" | "recoverable",
            }
          : undefined,
        outputs: a.outputs ? JSON.parse(a.outputs) : undefined,
      })),
      createdAt: new Date(taskData.created_at),
      updatedAt: new Date(taskData.updated_at),
    };

    // Initialize services
    const llmApi = getAPI(
      "anthropic",
      getLLMConfigLoaders(undefined, workingDir),
      getLoggers()
    );

    const llmService = createLLMService(llmApi);
    const dockerService = createDockerService();

    // Resume task processing
    const updatedTask = await processTask(task, llmService, dockerService);

    console.log(
      `Task ${taskId} processing completed with status: ${updatedTask.status}`
    );
  } catch (err) {
    console.error("Failed to resume task:", err);
    process.exit(1);
  }
}
