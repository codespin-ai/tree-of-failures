import { getDb } from "../db/index.js";
import Table from "cli-table3";

type TaskRow = {
  id: string;
  goal: string;
  status: string;
};

export async function listTasks() {
  try {
    const db = getDb();
    const tasks = db
      .prepare(
        `
      SELECT id, goal, status 
      FROM task 
      ORDER BY created_at DESC
    `
      )
      .all() as TaskRow[];

    const table = new Table({
      head: ["ID", "Goal", "Status"],
      colWidths: [36, 100, 15],
    });

    tasks.forEach((task: TaskRow) => {
      table.push([
        task.id,
        task.goal.length > 97 ? task.goal.substring(0, 97) + "..." : task.goal,
        task.status,
      ]);
    });

    console.log(table.toString());
  } catch (err) {
    console.error("Failed to list tasks:", err);
    process.exit(1);
  }
}
