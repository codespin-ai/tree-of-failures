import { CompletionAPI } from "../api/getCompletionAPI.js";
import { extractJsonFromText } from "../utils/jsonExtractor.js";
import { parseFilesFromLLMResponse } from "../utils/fileParser.js";
import type { TaskNode, Action, SourceFile } from "../types.js";

export class LLMService {
  constructor(private llmApi: CompletionAPI) {}

  private buildNextActionPrompt(currentTask: TaskNode): string {
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

  private buildErrorAnalysisPrompt(currentTask: TaskNode, error: any): string {
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

  private buildContinuationSummaryPrompt(currentTask: TaskNode): string {
    return `Given the current task state:

\`\`\`json
${JSON.stringify({ currentTask }, null, 2)}
\`\`\`

Please provide a brief summary of what steps might come next after this task. Include your response in a JSON code block with a "continuationSummary" field.

If the next steps involve creating or modifying files, you can include their contents using this format:

File path: path/to/file.ext
\`\`\`
file content goes here...
\`\`\`

Remember to provide the complete content for any files, without omitting any lines.`;
  }

  async getNextAction(
    currentTask: TaskNode,
    systemContext: string
  ): Promise<{ action: Action; files: SourceFile[] }> {
    const prompt = this.buildNextActionPrompt(currentTask);

    const messages = [
      {
        role: "system" as const,
        content: systemContext,
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    const result = await this.llmApi.completion(
      messages,
      undefined,
      {
        model: { name: "claude-3-sonnet-20240229", maxOutputTokens: 4096 },
        maxTokens: undefined,
      },
      process.cwd()
    );

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

  async handleError(
    currentTask: TaskNode,
    error: any,
    systemContext: string
  ): Promise<{ action: Action; files: SourceFile[] }> {
    const prompt = this.buildErrorAnalysisPrompt(currentTask, error);

    const messages = [
      {
        role: "system" as const,
        content: systemContext,
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    const result = await this.llmApi.completion(
      messages,
      undefined,
      {
        model: { name: "claude-3-sonnet-20240229", maxOutputTokens: 4096 },
        maxTokens: undefined,
      },
      process.cwd()
    );

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

  async getContinuationSummary(
    currentTask: TaskNode,
    systemContext: string
  ): Promise<string> {
    const prompt = this.buildContinuationSummaryPrompt(currentTask);

    const messages = [
      {
        role: "system" as const,
        content: systemContext,
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    const result = await this.llmApi.completion(
      messages,
      undefined,
      {
        model: { name: "claude-3-sonnet-20240229", maxOutputTokens: 4096 },
        maxTokens: undefined,
      },
      process.cwd()
    );

    const jsonResponse = extractJsonFromText(result.message);
    if (!jsonResponse?.continuationSummary) {
      throw new Error(
        "Invalid LLM response - missing continuationSummary in JSON block"
      );
    }

    return jsonResponse.continuationSummary;
  }

  async completion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    customConfigDir: string | undefined,
    options: any,
    workingDir: string
  ): Promise<{ message: string }> {
    return this.llmApi.completion(
      messages,
      customConfigDir,
      options,
      workingDir
    );
  }
}
