import { parseFilesFromLLMResponse } from "../utils/fileParser.js";
import type { TaskNode, Action } from "../types.js";
import * as libllm from "libllm";

export type LLMServiceAPI = {
  getNextAction: (
    currentTask: TaskNode,
    systemContext: string
  ) => Promise<{ action: Action; files: libllm.FileContent[] }>;
  handleError: (
    currentTask: TaskNode,
    error: any,
    systemContext: string
  ) => Promise<{ action: Action; files: libllm.FileContent[] }>;
  getContinuationSummary: (
    currentTask: TaskNode,
    systemContext: string
  ) => Promise<string>;
  completion: (
    messages: libllm.CompletionInputMessage[],
    customConfigDir: string | undefined,
    options: libllm.CompletionOptions
  ) => Promise<{ message: string }>;
};

export function createLLMService(llmApi: libllm.LLMAPI): LLMServiceAPI {
  async function getNextAction(
    currentTask: TaskNode,
    systemContext: string
  ): Promise<{ action: Action; files: libllm.FileContent[] }> {
    const prompt = buildNextActionPrompt(currentTask);

    const messages: libllm.CompletionInputMessage[] = [
      {
        role: "user",
        content: systemContext + "\n\n" + prompt,
      },
    ];

    const result = await llmApi.completion(messages, {
      model: {
        name: "claude-3-sonnet",
        provider: "anthropic",
        maxOutputTokens: 4096,
      },
      maxTokens: undefined,
    });

    // Extract JSON action
    const jsonResponse = extractJsonFromText(result.message);
    if (!jsonResponse?.action) {
      throw new Error("Invalid LLM response - missing action in JSON block");
    }

    // Extract any file contents
    const files = parseFilesFromLLMResponse(result.message);

    return {
      action: jsonResponse.action,
      files,
    };
  }

  async function handleError(
    currentTask: TaskNode,
    error: any,
    systemContext: string
  ): Promise<{ action: Action; files: libllm.FileContent[] }> {
    const prompt = buildErrorAnalysisPrompt(currentTask, error);

    const messages: libllm.CompletionInputMessage[] = [
      {
        role: "user",
        content: systemContext + "\n\n" + prompt,
      },
    ];

    const result = await llmApi.completion(messages, {
      model: {
        name: "claude-3-sonnet",
        provider: "anthropic",
        maxOutputTokens: 4096,
      },
      maxTokens: undefined,
    });

    const jsonResponse = extractJsonFromText(result.message);
    if (!jsonResponse?.action) {
      throw new Error("Invalid LLM response - missing action in JSON block");
    }

    const files = parseFilesFromLLMResponse(result.message);

    return {
      action: jsonResponse.action,
      files,
    };
  }

  async function getContinuationSummary(
    currentTask: TaskNode,
    systemContext: string
  ): Promise<string> {
    const prompt = buildContinuationSummaryPrompt(currentTask);

    const messages: libllm.CompletionInputMessage[] = [
      {
        role: "user",
        content: systemContext + "\n\n" + prompt,
      },
    ];

    const result = await llmApi.completion(messages, {
      model: {
        name: "claude-3-sonnet",
        provider: "anthropic",
        maxOutputTokens: 4096,
      },
      maxTokens: undefined,
    });

    const jsonResponse = extractJsonFromText(result.message);
    if (!jsonResponse?.continuationSummary) {
      throw new Error(
        "Invalid LLM response - missing continuationSummary in JSON block"
      );
    }

    return jsonResponse.continuationSummary;
  }

  async function completion(
    messages: libllm.CompletionInputMessage[],
    customConfigDir: string | undefined,
    options: libllm.CompletionOptions
  ): Promise<{ message: string }> {
    return llmApi.completion(messages, options);
  }

  return {
    getNextAction,
    handleError,
    getContinuationSummary,
    completion,
  };
}

function buildNextActionPrompt(currentTask: TaskNode): string {
  return `You are helping to complete a task in a Docker environment. Here is the current task state:

\`\`\`json
${JSON.stringify({ currentTask }, null, 2)}
\`\`\`

What should be the next action to take? Your response should include:
1. An explanation of what needs to be done
2. A JSON code block with the action details
3. If the action involves creating or modifying files, include the complete file contents using this format:

File path: path/to/file.ext
\`\`\`
file content goes here...
\`\`\`

Remember to provide the complete content for any files, without omitting any lines.`;
}

function buildErrorAnalysisPrompt(currentTask: TaskNode, error: any): string {
  return `The previous action failed in our Docker environment. Here is the current task state and error:

\`\`\`json
${JSON.stringify({ currentTask, error }, null, 2)}
\`\`\`

Please analyze what went wrong and provide the next action to take. Include:
1. Your analysis of the error
2. A JSON code block with the next action details
3. If the action involves creating or modifying files, include the complete file contents using this format:

File path: path/to/file.ext
\`\`\`
file content goes here...
\`\`\`

Remember to provide the complete content for any files, without omitting any lines.`;
}

function buildContinuationSummaryPrompt(currentTask: TaskNode): string {
  return `Given the current task state:

\`\`\`json
${JSON.stringify({ currentTask }, null, 2)}
\`\`\`

Please provide a brief summary of what steps might come next after this task. Include your response in a JSON code block with a "continuationSummary" field.`;
}

function extractJsonFromText(text: string): any {
  const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
  const match = text.match(jsonBlockRegex);
  if (!match) {
    throw new Error("No JSON block found in response");
  }
  return JSON.parse(match[1]);
}
