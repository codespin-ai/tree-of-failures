# toff (Tree of Failures)

toff is a CLI tool that uses Large Language Models (LLMs) to solve complex tasks through systematic exploration of approaches, tracking both successes and failures.

## Core Concept

toff maintains a dialogue with an LLM to:

1. Break down complex goals into smaller tasks
2. Select the best next action based on previous attempts
3. Learn from failures to inform future attempts
4. Track the tree of attempts and their outcomes

## How It Works

### Task Structure

Each task in toff represents a specific objective and its execution details:

```typescript
type TaskNode = {
  id: string;
  description: string; // What we're trying to do
  goal: string; // Desired outcome
  parentId?: string; // Parent task if this is a subtask
  continuationSummary?: string; // What might come next
  status: "pending" | "in_progress" | "success" | "failed";
  dockerSnapshotId?: string;
  attempts: AttemptResult[];
  createdAt: Date;
  updatedAt: Date;
};

type Action = {
  id: string;
  type: "shell" | "files" | "http" | "llm_call" | "docker" | "custom";
  description: string;
  params: Record<string, unknown>;
};

type AttemptResult = {
  action: Action;
  status: "success" | "failure";
  error?: {
    code: string;
    message: string;
    severity: "fatal" | "recoverable";
  };
  outputs?: {
    stdout?: string;
    stderr?: string;
    result?: unknown;
  };
};

type FileContent = {
  path: string;
  content: string;
};
```

### Interaction Flow

1. **Initial Task Creation**
   When you run `toff prompt "Install Redis"`, toff:

   - Creates a new task
   - Starts a Docker container
   - Begins the LLM conversation

2. **LLM-toff Communication**

   toff communicates with the LLM using natural language prompts that include JSON blocks when needed. The LLM can respond with both actions and file modifications in a single response. Here's an example:

   toff → LLM:

   ````
   You are helping to complete a task in a Docker environment. Here is the current task state:

   ```json
   {
     "currentTask": {
       "id": "task_1",
       "description": "Install Redis with custom configuration",
       "goal": "Have Redis running with specified settings",
       "status": "pending",
       "attempts": []
     }
   }
   ````

   What should be the next action to take? Your response should include:

   1. An explanation of what needs to be done
   2. A JSON code block with the action details
   3. If the action involves creating or modifying files, include the complete file contents

   ```

   LLM → toff:
   ```

   We need to create a Redis configuration file and then install Redis. Here's what we'll do:

   ```json
   {
     "action": {
       "type": "shell",
       "description": "Install Redis server",
       "params": {
         "command": "apt-get install -y redis-server"
       }
     },
     "reasoning": "Installing Redis with default configuration first",
     "expectedOutcome": "Redis will be installed successfully"
   }
   ```

   Before executing the installation, let's create the configuration file:

   File path: /etc/redis/redis.conf

   ```
   bind 127.0.0.1
   protected-mode yes
   port 6379
   tcp-backlog 511
   timeout 0
   tcp-keepalive 300
   daemonize yes
   supervised systemd
   pidfile /var/run/redis/redis-server.pid
   loglevel notice
   logfile /var/log/redis/redis-server.log
   databases 16
   always-show-logo yes
   set-proc-title yes
   proc-title-template "{title} {listen-addr} {server-mode}"
   stop-writes-on-bgsave-error yes
   rdbcompression yes
   rdbchecksum yes
   dbfilename dump.rdb
   rdb-del-sync-files no
   dir /var/lib/redis
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```

   ```

   ```

3. **Action and File Execution**
   - toff extracts both the JSON action and any file operations from the LLM response
   - Creates or modifies any specified files in the Docker container
   - Executes the main action
   - Records the attempt and its result
   - Sends the result back to the LLM

### File Operations

The LLM can include file operations in its responses using a simple format:

```
File path: path/to/file.ext
```

file content goes here...

```

```

Key characteristics:

- Complete file contents must always be provided
- No partial updates or omitted content is allowed
- Files are created/modified before the main action executes
- Directories are automatically created if they don't exist

### Learning from Failures

When an attempt fails, toff sends the updated task state to the LLM including:

- The failed action and its error
- Complete history of previous attempts
- Current state of the task

The LLM analyzes this information and can respond with:

- Analysis of why the attempt failed
- A new action to try (as a JSON block)
- Any necessary file modifications
- Optional explanation of the chosen approach

### State Management

toff maintains state through:

1. Docker containers for isolation
2. SQLite database for task tracking
3. Automatic file operation handling
4. Action attempt history

The LLM has access to:

- Current task state
- All previous attempts
- Error information
- System context from Docker

## Installation

```bash
npm install -g toff
```

## Usage

Create a new task:

```bash
toff prompt "Your task description"
```

## Configuration

Supports multiple LLM providers:

- Anthropic (Claude)
- OpenAI

Set your API keys via environment variables:

```bash
export ANTHROPIC_API_KEY=your_key_here
# or
export OPENAI_API_KEY=your_key_here
```

## License

MIT
