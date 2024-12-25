import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type DockerServiceAPI = {
  executeCommand: (command: string) => Promise<CommandResult>;
  takeSnapshot: (containerId: string) => Promise<string>;
};

export function createDockerService(): DockerServiceAPI {
  async function executeCommand(command: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        exitCode: error.code || 1,
      };
    }
  }

  async function takeSnapshot(containerId: string): Promise<string> {
    const snapshotId = `snapshot_${Date.now()}`;
    await executeCommand(`docker commit ${containerId} ${snapshotId}`);
    return snapshotId;
  }

  return {
    executeCommand,
    takeSnapshot,
  };
}
