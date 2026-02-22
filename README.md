# Memory CP

**Orchestrate multiple [OpenClaw](https://openclaw.com) AI agents with shared persistent memory powered by [DeepLake](https://deeplake.ai).**

Memory CP is an MCP server that acts as a control plane for AI agent collaboration. It connects multiple OpenClaw instances to a shared filesystem (via Deep Lake CLI), enabling agents to read and write files that are instantly visible to all participants — humans and AI alike.

## How it works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  OpenClaw #1 │     │  OpenClaw #2 │     │  OpenClaw #N │
│  (AI Agent)  │     │  (AI Agent)  │     │  (AI Agent)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────┬───────┴────────────────────┘
                    │
             ┌──────┴───────┐
             │  Memory CP   │  ← MCP Server (this project)
             │  (Control    │
             │   Plane)     │
             └──────┬───────┘
                    │
         ┌──────────┴──────────┐
         │   Deep Lake CLI     │  ← Shared persistent memory
         │  (cloud-native      │     synced in real-time
         │   filesystem)       │
         └─────────────────────┘
```

- **OpenClaw agents** are autonomous AI coding agents. Memory CP can dispatch tasks to any number of them and collect results.
- **Deep Lake** provides a cloud-native virtual filesystem mounted via the Deep Lake CLI. Every file written by any agent (or user) is instantly available to all others, with full SQL-queryable search via the Deep Lake API.
- **Memory CP** ties it all together: it exposes MCP tools that let any MCP-compatible client (ChatGPT, Claude, custom apps) orchestrate agents and manage shared memory through a single interface.

## MCP Tools

| Tool | Description |
|------|-------------|
| `list-agents` | List all connected OpenClaw agents and their online/offline status |
| `send-task` | Dispatch a task to a specific OpenClaw agent (the agent can read/write shared memory) |
| `list-files` | Browse files in the shared Deep Lake memory filesystem |
| `read-file` | Read a file from shared memory |
| `write-file` | Write a file to shared memory (instantly visible to all agents) |
| `search-memory` | Full-text search across all memories via Deep Lake SQL API |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file:

```env
# OpenClaw agents (JSON array of {id, url, token, name})
OPENCLAW_SERVERS='[{"id":"agent-1","url":"https://your-openclaw.com","token":"...","name":"Coder"}]'

# Optional: secure the MCP endpoint with a Bearer token
MCP_API_KEY=your-secret-key

# Deep Lake mount path (defaults to ./1)
DEEPLAKE_MOUNT=/path/to/deeplake/mount
```

Deep Lake credentials are loaded automatically from `~/.deeplake/credentials.json` and `~/.deeplake/mounts.json` (created by the Deep Lake CLI when you mount a filesystem).

### 3. Run the server

```bash
npm run dev
```

Open [http://localhost:3000/inspector](http://localhost:3000/inspector) to test your tools interactively.

## Deploy

```bash
npm run deploy
```

Deploys to [Manufact Cloud](https://manufact.com).

## Built with

- [mcp-use](https://mcp-use.com) — MCP server framework
- [OpenClaw](https://openclaw.com) — autonomous AI agents
- [Deep Lake](https://deeplake.ai) — cloud-native virtual filesystem for AI agents
