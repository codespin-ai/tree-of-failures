import { getDb } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";
import type { TaskNode } from "../types.js";

export async function createTask(
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