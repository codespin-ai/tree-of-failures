import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { LLMService } from "../services/llm.js";
import { TaskManager } from "../services/taskManager.js";
import { DockerService } from "../services/docker.js";

export async function promptCommand(prompt: string) {
  const llmApi = getCompletionAPI("anthropic");
  const llmService = new LLMService(llmApi);
  const dockerService = new DockerService();
  const taskManager = new TaskManager(llmService, dockerService);

  try {
    const task = await taskManager.createTask(prompt);
    // Start processing the task...
  } catch (err) {
    console.error("Failed to process prompt:", err);
    process.exit(1);
  }
}
