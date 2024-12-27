import { ModelDescription } from "libllm";

export type ToffConfig = {
  version: string;

  // Task execution settings
  task: {
    maxAttempts: number; // Maximum attempts before declaring failure
    maxDepth: number; // Maximum depth for task decomposition
    defaultTimeout: number; // Default timeout for actions in milliseconds
  };

  // LLM settings
  llm: {
    defaultModel: string; // Default model for general operations
    planningModel: string; // Model for task planning/decomposition
    errorModel: string; // Model for error analysis
    models: ModelDescription[]; // Available models configuration
    maxTokens: number; // Default max tokens for LLM calls
    temperature: {
      planning: number; // Temperature for task planning
      execution: number; // Temperature for action generation
      error: number; // Temperature for error analysis
    };
  };

  // Docker settings
  docker: {
    snapshotFrequency: "never" | "action" | "task"; // When to take snapshots
    keepSnapshots: number; // How many snapshots to retain
    resourceLimits: {
      memory: string; // Memory limit (e.g., "2gb")
      cpu: number; // CPU limit
    };
  };

  // System settings
  system: {
    logging: {
      level: "debug" | "info" | "warn" | "error";
      file: boolean; // Whether to log to file
    };
    fileOps: {
      maxSize: number; // Maximum file size in bytes
      allowedPaths: string[]; // Allowed paths for file operations
    };
    http: {
      timeout: number; // HTTP request timeout
      maxRetries: number; // Maximum retries for HTTP requests
    };
  };
};
