import { getAPI } from "libllm";
import { getLoggers } from "../console.js";
import { createDockerService, DockerServiceAPI } from "../services/docker.js";
import { createLLMService, LLMServiceAPI } from "../services/llm.js";
import { getLLMConfigLoaders } from "../settings/getLLMConfigLoaders.js";
import { createTask } from "../tasks/create.js";
import { executeAction } from "../tasks/executeAction.js";
import { TaskNode } from "../types.js";
import { processTask } from "../tasks/processTask.js";

export async function promptCommand(prompt: string, workingDir: string) {
  const llmApi = getAPI(
    "anthropic",
    getLLMConfigLoaders(undefined, workingDir),
    getLoggers()
  );

  const llmService = createLLMService(llmApi);
  const dockerService = createDockerService();

  try {
    const task = await createTask(prompt);
    await processTask(task, llmService, dockerService);
  } catch (err) {
    console.error("Failed to process prompt:", err);
    process.exit(1);
  }
}
