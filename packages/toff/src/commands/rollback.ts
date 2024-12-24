import { getDb } from "../db/index.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function rollbackTask(taskId: string) {
  try {
    const db = getDb();

    // Get snapshot info for task
    const snapshot = db
      .prepare(
        `
      SELECT container_id, snapshot_id
      FROM docker_snapshot
      WHERE task_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `
      )
      .get(taskId);

    if (!snapshot) {
      throw new Error(`No snapshot found for task ${taskId}`);
    }

    // Stop current container
    await execAsync(`docker stop ${snapshot.container_id}`);

    // Restore snapshot
    await execAsync(`docker start ${snapshot.container_id}`);
    await execAsync(
      `docker exec ${snapshot.container_id} /bin/sh -c "docker load ${snapshot.snapshot_id}"`
    );

    console.log(`Rolled back to task ${taskId}`);
  } catch (err) {
    console.error("Failed to rollback:", err);
    process.exit(1);
  }
}
