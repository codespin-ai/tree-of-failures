import { AnthropicConfig, CompletionInputMessage, CompletionOptions, OpenAIConfig } from "libllm";

/**
 * Unique identifier for a task node in the tree.
 * Format: "task_<uuid>"
 */
export type TaskId = string;

/**
 * Unique identifier for an action within a task.
 * Format: "action_<uuid>"
 */
export type ActionId = string;

/**
 * Unique identifier for a Docker container snapshot.
 * Format: "snapshot_<uuid>"
 * Used to track environment states for rollback.
 */
export type DockerSnapshotId = string;

/**
 * Types of actions that can be performed within a task.
 * Each type represents a different kind of operation:
 *
 * - shell: Execute shell commands (e.g., installations, running scripts)
 * - files: File system operations (create, read, write, delete)
 * - http: Make HTTP requests (API calls, downloads)
 * - llm_call: Interact with language models
 * - docker: Docker-specific operations (beyond automatic snapshots)
 * - custom: User-defined actions
 */
export type ActionType =
  | "shell"
  | "files"
  | "http"
  | "llm_call"
  | "docker"
  | "custom";

export type ActionParams = {
  shell: {
    command: string;
  };
  files: {
    filename: string;
    content: string;
  };
  http: {
    url: string;
    method: string;
    body?: unknown;
  };
  llm_call: {
    messages: CompletionInputMessage[];
    options: CompletionOptions;
  };
  docker: {
    command: string;
  };
  custom: Record<string, unknown>;
};

/**
 * Represents a concrete action to be performed.
 * Actions are atomic operations that move us closer to the task's goal.
 */
export type Action = {
  /** Unique identifier for this action */
  id: ActionId;

  /** The type of action to perform */
  type: ActionType;

  /** Human-readable description of what this action does */
  description: string;

  /**
   * Parameters specific to the action type.
   */
  params: ActionParams[keyof ActionParams];
};

/**
 * Result of attempting an action.
 * Captures both successful and failed attempts, along with relevant outputs.
 */
export type AttemptResult = {
  /** The action that was attempted */
  action: Action;

  /** Whether the attempt succeeded or failed */
  status: "success" | "failure";

  /**
   * Error information if the attempt failed.
   * Includes severity to determine if we should retry or backtrack.
   */
  error?: {
    /** Error code for programmatic handling */
    code: string;

    /** Human-readable error message */
    message: string;

    /**
     * Error severity:
     * - recoverable: Can try again or try slightly different approach
     * - fatal: Need to backtrack and try completely different approach
     */
    severity: "fatal" | "recoverable";
  };

  /**
   * Outputs from the action execution.
   * Useful for debugging and decision making.
   */
  outputs?: {
    /** Standard output from command execution */
    stdout?: string;

    /** Standard error from command execution */
    stderr?: string;

    /** Any other type of output data */
    result?: unknown;
  };
};

/**
 * Represents a node in the Tree of Failures.
 * Each node is a task that might need multiple attempts to complete.
 */
export type TaskNode = {
  /** Unique identifier for this task */
  id: TaskId;

  /** What are we trying to do in this specific task? */
  description: string;

  /** What's the desired outcome of this task? */
  goal: string;

  /** Reference to parent task (if this is a subtask) */
  parentId?: TaskId;

  /**
   * Brief description of what might come next after this task.
   * Used to help plan the next steps without committing to them.
   */
  continuationSummary?: string;

  /**
   * Current status of the task:
   * - pending: Not started
   * - in_progress: Currently being worked on
   * - success: Completed successfully
   * - failed: Failed and no more attempts will be made
   */
  status: "pending" | "in_progress" | "success" | "failed";

  /**
   * Reference to Docker snapshot for this task's environment.
   * Used for rolling back if we need to backtrack.
   */
  dockerSnapshotId?: DockerSnapshotId;

  /** All attempts made for this task */
  attempts: AttemptResult[];

  /** When was this task created? */
  createdAt: Date;

  /** When was this task last updated? */
  updatedAt: Date;
};
