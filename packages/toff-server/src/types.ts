/**
 * Tree of Failures (ToF) - A Dynamic Problem Solving Approach
 *
 * Key Concepts:
 *
 * 1. Success Path vs Failure Tree
 * - The eventual solution is a linear chain of successful actions
 * - But discovering this path requires exploring a tree of failures
 * - We maintain the tree to track what approaches have been tried and failed
 *
 * 2. Environment Management
 * - Each node in the tree has an associated environment state
 * - When backtracking, we restore the environment to that state
 * - This allows us to try different approaches from the same starting point
 * - Implemented via Docker commits or similar snapshot mechanisms
 *
 * 3. Dynamic Path Discovery
 * - We don't pre-plan the entire solution
 * - Each next step is generated based on current state and past failures
 * - When a step fails, we backtrack to an appropriate point and try a different approach
 * - The backtrack point might be several steps back
 *
 * Example Flow:
 * 1. Try an action
 * 2. If it succeeds:
 *    - Record it as part of the success path
 *    - Generate and try next action
 * 3. If it fails:
 *    - Record the failure
 *    - Backtrack to appropriate point
 *    - Restore environment
 *    - Try alternative approach
 *
 * The success path is discovered through this process of trial,
 * failure, and backtracking, while maintaining a record of what
 * didn't work to avoid repeating mistakes.
 */

export type TaskId = string;
export type ActionId = string;
export type EnvironmentId = string;

/**
 * Represents a snapshot of the environment at a particular point
 * Could be a Docker commit, VM snapshot, etc.
 */
export type Environment = {
  id: EnvironmentId;
  snapshot: string;
  parentId?: EnvironmentId;
  metadata?: Record<string, unknown>;
};

/**
 * Types of actions that can be performed
 */
export type ActionType =
  | "shell" // Shell commands
  | "file" // File operations
  | "http" // HTTP requests
  | "llm_call" // LLM API calls
  | "docker" // Docker operations
  | "custom"; // Custom actions

/**
 * A concrete action that can be performed
 */
export type Action = {
  id: ActionId;
  type: ActionType;
  params: Record<string, unknown>;
  evaluateSuccess: () => Promise<boolean>;
  rollback?: () => Promise<void>; // Optional rollback operation
};

/**
 * Result of attempting an action
 */
export type AttemptResult = {
  action: Action;
  nextTask?: TaskNode; // Present if this was a composite action
  status: "success" | "failure";
  error?: string;
  metadata?: Record<string, unknown>;
};

/**
 * A node in the tree representing a task/state
 */
export type TaskNode = {
  id: TaskId;
  description: string;
  goal: string;

  // Environmental state at this node
  environment: Environment;

  // Tree structure
  parentId?: TaskId;

  // Track all attempts at this node
  attempts: AttemptResult[];

  // The successful path from this node (if found)
  successPath?: {
    action: Action;
    nextTask?: TaskNode;
  };

  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Generates next actions based on current state and history
 */
export type ActionGenerator = {
  generateNextAction: (
    task: TaskNode,
    previousAttempts: AttemptResult[]
  ) => Promise<Action>;
};

/**
 * Core executor that manages the ToF process
 */
export type TaskExecutor = {
  // Main execution
  execute: (task: TaskNode) => Promise<void>;

  // Core operations
  tryAction: (task: TaskNode, action: Action) => Promise<boolean>;
  backtrack: (task: TaskNode) => Promise<TaskNode>;
  restoreEnvironment: (env: Environment) => Promise<void>;

  // State management
  getTaskState: (taskId: TaskId) => Promise<TaskNode>;
  saveTaskState: (task: TaskNode) => Promise<void>;

  // Environment management
  createEnvironmentSnapshot: (env: Environment) => Promise<string>;
  restoreEnvironmentSnapshot: (snapshot: string) => Promise<void>;
};

/**
 * Manages persistent storage of the task tree
 */
export type TaskStorage = {
  saveTask: (task: TaskNode) => Promise<void>;
  loadTask: (taskId: TaskId) => Promise<TaskNode>;
  updateTask: (task: TaskNode) => Promise<void>;
  deleteTask: (taskId: TaskId) => Promise<void>;
  listTasks: () => Promise<TaskNode[]>;
};

/**
 * Complete tree of attempts, both failures and successes
 */
export type TaskTree = {
  rootTask: TaskNode;
  currentTask: TaskNode;

  // Navigation
  backtrack: () => Promise<TaskNode>;

  // Analysis
  getFailurePaths: () => TaskNode[];
  getSuccessPath: () => TaskNode[];

  // Visualization
  generateDotGraph: () => string;
};
