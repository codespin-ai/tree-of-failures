import { getAPI } from "libllm";
import { getLoggers } from "../console.js";
import { createDockerService, DockerServiceAPI } from "../services/docker.js";
import { createLLMService, LLMServiceAPI } from "../services/llm.js";
import { getLLMConfigLoaders } from "../settings/getLLMConfigLoaders.js";
import { createTask } from "../tasks/create.js";
import { executeAction } from "../tasks/executeAction.js";
import { TaskNode } from "../types.js";

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

async function processTask(
  task: TaskNode,
  llmService: LLMServiceAPI,
  dockerService: DockerServiceAPI
) {
  const systemContext =
    "You are working in a Docker environment to complete tasks.";

  while (task.status !== "success" && task.status !== "failed") {
    task.status = "in_progress";

    const { action, files } = await llmService.getNextAction(
      task,
      systemContext
    );
    const result = await executeAction(
      task,
      action,
      files,
      llmService,
      dockerService
    );

    task.attempts.push(result);

    if (result.status === "failure") {
      if (result.error?.severity === "fatal") {
        task.status = "failed";
        break;
      }

      const { action: retryAction, files: retryFiles } =
        await llmService.handleError(task, result.error, systemContext);

      const retryResult = await executeAction(
        task,
        retryAction,
        retryFiles,
        llmService,
        dockerService
      );

      task.attempts.push(retryResult);
      if (retryResult.status === "failure") {
        task.status = "failed";
        break;
      }
    }

    if (task.attempts.length >= 10) {
      task.status = "failed";
      break;
    }

    const continuationSummary = await llmService.getContinuationSummary(
      task,
      systemContext
    );
    task.continuationSummary = continuationSummary;

    if (task.attempts[task.attempts.length - 1].status === "success") {
      task.status = "success";
    }
  }

  return task;
}

export { promptCommand as createTask };
