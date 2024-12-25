import { getAPI } from "libllm";
import { createLLMService } from "../services/llm.js";
import { createDockerService } from "../services/docker.js";
import { createTaskManager } from "../services/taskManager.js";
import { getLLMConfigLoaders } from "../settings/getLLMConfigLoaders.js";
import { getLoggers } from "../console.js";

export async function promptCommand(prompt: string, workingDir: string) {
  const llmApi = getAPI(
    "anthropic",
    getLLMConfigLoaders(undefined, workingDir),
    getLoggers()
  );
  const llmService = createLLMService(llmApi);
  const dockerService = createDockerService();
  const taskManager = createTaskManager(llmService, dockerService);

  try {
    const task = await taskManager.createTask(prompt);
    // Start processing the task...
  } catch (err) {
    console.error("Failed to process prompt:", err);
    process.exit(1);
  }
}

export { promptCommand as createTask };
