import { getDb } from "../db/index.js";
import Table from "cli-table3";

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
  action_type: string;
  action_description: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  error_severity: string | null;
  outputs: string | null;
  created_at: string;
};

export async function viewTask(taskId: string) {
  try {
    const db = getDb();

    // Get task details
    const task = db
      .prepare(
        `
      SELECT * FROM task WHERE id = @taskId
    `
      )
      .get({ taskId }) as TaskRow;

    if (!task) {
      console.error(`Task ${taskId} not found`);
      process.exit(1);
    }

    // Get attempts
    const attempts = db
      .prepare(
        `
      SELECT * FROM attempt WHERE task_id = @taskId ORDER BY created_at ASC
    `
      )
      .all({ taskId }) as AttemptRow[];

    // Print task details
    console.log("\nTask Details:");
    const taskTable = new Table({
      style: { head: ["cyan"] },
      head: ["Property", "Value"],
    });

    taskTable.push(
      ["ID", task.id],
      ["Description", task.description],
      ["Goal", task.goal],
      ["Status", task.status],
      ["Parent ID", task.parent_id || "None"],
      ["Created At", task.created_at],
      ["Updated At", task.updated_at]
    );

    console.log(taskTable.toString());

    // Print attempts
    if (attempts.length > 0) {
      console.log("\nAttempts:");
      attempts.forEach((attempt: AttemptRow, index: number) => {
        console.log(`\nAttempt ${index + 1}:`);
        const attemptTable = new Table({
          style: { head: ["cyan"] },
          head: ["Property", "Value"],
        });

        attemptTable.push(
          ["Action Type", attempt.action_type],
          ["Action Description", attempt.action_description],
          ["Status", attempt.status],
          ["Created At", attempt.created_at]
        );

        if (attempt.error_code) {
          attemptTable.push(
            ["Error Code", attempt.error_code],
            ["Error Message", attempt.error_message || ""],
            ["Error Severity", attempt.error_severity || ""]
          );
        }

        if (attempt.outputs) {
          attemptTable.push(["Outputs", attempt.outputs]);
        }

        console.log(attemptTable.toString());
      });
    }
  } catch (err) {
    console.error("Failed to view task:", err);
    process.exit(1);
  }
}
