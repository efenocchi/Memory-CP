import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── DeepLake FUSE mount path ────────────────────────────────────────
const DEEPLAKE_MOUNT =
  process.env.DEEPLAKE_MOUNT || "/home/emanuele/34_yc_hackathon/Memory-CP/1";

// ── DeepLake API direct access ──────────────────────────────────────
interface DeepLakeConfig {
  token: string;
  orgId: string;
  apiUrl: string;
  workspaceId: string;
  tableName: string;
}

function loadDeepLakeConfig(): DeepLakeConfig | null {
  try {
    const home = process.env.HOME || "/home/emanuele";
    const credsPath = join(home, ".deeplake", "credentials.json");
    const mountsPath = join(home, ".deeplake", "mounts.json");

    if (!existsSync(credsPath) || !existsSync(mountsPath)) return null;

    const creds = JSON.parse(readFileSync(credsPath, "utf-8"));
    const mounts = JSON.parse(readFileSync(mountsPath, "utf-8"));

    const mount = mounts.mounts?.find(
      (m: any) => m.mountPath === DEEPLAKE_MOUNT
    );
    if (!mount) return null;

    const dbParts = mount.dbUrl?.match(
      /deeplake:\/\/([^/]+)\/([^/]+)\/([^/]+)/
    );

    return {
      token: creds.token,
      orgId: creds.orgId,
      apiUrl: creds.apiUrl || "https://api-beta.deeplake.ai",
      workspaceId: mount.workspaceName || dbParts?.[2] || "default",
      tableName: mount.tableName || dbParts?.[3] || "hackathon_memory",
    };
  } catch {
    return null;
  }
}

async function queryDeepLake(
  sql: string
): Promise<{ columns?: string[]; rows?: unknown[][] }> {
  const cfg = loadDeepLakeConfig();
  if (!cfg) throw new Error("DeepLake credentials not found in ~/.deeplake/");

  // Resolve workspaceId (name → uuid)
  const wsRes = await fetch(`${cfg.apiUrl}/workspaces`, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "X-Activeloop-Org-Id": cfg.orgId,
    },
  });
  if (!wsRes.ok)
    throw new Error(`Failed to list workspaces: HTTP ${wsRes.status}`);

  const wsData = (await wsRes.json()) as
    | { data?: Array<{ id: string; name: string }> }
    | Array<{ id: string; name: string }>;
  const workspaces = Array.isArray(wsData) ? wsData : wsData.data || [];
  const ws = workspaces.find(
    (w: any) => w.name === cfg.workspaceId || w.id === cfg.workspaceId
  );
  const wsId = ws?.id || cfg.workspaceId;

  const res = await fetch(`${cfg.apiUrl}/workspaces/${wsId}/tables/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "X-Activeloop-Org-Id": cfg.orgId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `DeepLake query failed: HTTP ${res.status} ${body.substring(0, 300)}`
    );
  }

  return (await res.json()) as { columns?: string[]; rows?: unknown[][] };
}

// ── Auth ─────────────────────────────────────────────────────────────
const MCP_API_KEY = process.env.MCP_API_KEY || "";

// ── OpenClaw ─────────────────────────────────────────────────────────
interface OpenClawServer {
  id: string;
  url: string;
  token: string;
  name: string;
}

function getServers(): OpenClawServer[] {
  const raw = process.env.OPENCLAW_SERVERS;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OpenClawServer[];
  } catch {
    console.error("Failed to parse OPENCLAW_SERVERS env var");
    return [];
  }
}

function getServer(serverId: string): OpenClawServer | undefined {
  return getServers().find((s) => s.id === serverId);
}

async function callOpenClaw(
  serverId: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const server = getServer(serverId);
  if (!server) return { ok: false, error: `Server "${serverId}" not found` };

  try {
    const res = await fetch(`${server.url}${endpoint}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${server.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}: ${JSON.stringify(data)}`,
      };
    }
    return { ok: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ── Server ───────────────────────────────────────────────────────────
const server = new MCPServer({
  name: "memory-cp",
  title: "Memory CP",
  version: "1.0.0",
  description:
    "Orchestrate OpenClaw agents with shared DeepLake memory. Multi-user collaborative AI memory.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://manufact.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// ── Bearer Auth Middleware ───────────────────────────────────────────
if (MCP_API_KEY) {
  const authMiddleware = async (c: any, next: any) => {
    const auth = c.req.header("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }
    if (auth.slice(7) !== MCP_API_KEY) {
      return c.json({ error: "Invalid API key" }, 401);
    }
    await next();
  };
  server.app.use("/mcp/*", authMiddleware);
  server.app.use("/mcp", authMiddleware);
}

// ═════════════════════════════════════════════════════════════════════
// Tools (6 total)
// ═════════════════════════════════════════════════════════════════════

// ── 1. list-agents ──────────────────────────────────────────────────
server.tool(
  {
    name: "list-agents",
    description:
      "List all connected OpenClaw agents and their status.",
    schema: z.object({}),
    widget: {
      name: "memory-dashboard",
      invoking: "Checking agents...",
      invoked: "Agent list loaded",
    },
  },
  async () => {
    const servers = getServers();
    const agents = await Promise.all(
      servers.map(async (s) => {
        const result = await callOpenClaw(s.id, "/api/key-files");
        return {
          id: s.id,
          name: s.name,
          status: result.ok ? ("online" as const) : ("offline" as const),
          lastActivity: new Date().toISOString(),
        };
      })
    );

    return widget({
      props: { agents, memories: [], view: "dashboard" as const },
      output: text(
        `Found ${agents.length} agent(s): ${agents.map((a) => `${a.name} (${a.status})`).join(", ")}`
      ),
    });
  }
);

// ── 2. send-task ────────────────────────────────────────────────────
server.tool(
  {
    name: "send-task",
    description:
      "Send a task to an OpenClaw agent. The agent can create, read, and modify files in the shared DeepLake memory.",
    schema: z.object({
      agentId: z.string().describe("ID of the target agent"),
      task: z.string().describe("The task description to send"),
      model: z
        .string()
        .optional()
        .describe("AI model override (default: server's configured model)"),
    }),
    widget: {
      name: "memory-dashboard",
      invoking: "Sending task...",
      invoked: "Task completed",
    },
  },
  async ({ agentId, task, model }) => {
    const systemPrompt =
      "You are an AI agent with access to a shared filesystem at ~/memory-cp/1/ (DeepLake FUSE mount). You can create, read, and modify files there. All files you write will be visible to other connected agents and users in real-time. Execute the user's task and report what you did.";

    const result = await callOpenClaw(agentId, "/v1/chat/completions", {
      model: model || "default",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: task },
      ],
    });

    let agentResponse = "";
    if (result.ok && result.data) {
      const data = result.data as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      agentResponse =
        data.choices?.[0]?.message?.content || "No response from agent.";
    }

    const taskResult = {
      agentId,
      status: result.ok ? "completed" : "failed",
      message: result.ok
        ? `Agent "${agentId}" responded:\n\n${agentResponse}`
        : `Failed: ${result.error}`,
    };

    return widget({
      props: { taskResult, view: "task-sent" as const },
      output: text(taskResult.message),
    });
  }
);

// ── 3. list-files ───────────────────────────────────────────────────
server.tool(
  {
    name: "list-files",
    description:
      "List files in the shared DeepLake memory filesystem.",
    schema: z.object({
      path: z
        .string()
        .optional()
        .describe("Subdirectory to list (relative to root). Defaults to root."),
    }),
    widget: {
      name: "memory-dashboard",
      invoking: "Listing files...",
      invoked: "Files listed",
    },
  },
  async ({ path }) => {
    const targetDir = path ? join(DEEPLAKE_MOUNT, path) : DEEPLAKE_MOUNT;

    try {
      const entries = await readdir(targetDir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = join(targetDir, entry.name);
          let size = 0;
          try {
            const s = await stat(fullPath);
            size = s.size;
          } catch {}
          return {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size,
          };
        })
      );

      const memories = files.map((f) => ({
        id: f.name,
        content: `${f.type === "directory" ? "📁" : "📄"} ${f.name} ${f.type === "file" ? `(${f.size} bytes)` : ""}`,
        source: "DeepLake FS",
        timestamp: new Date().toISOString(),
        tags: [f.type],
      }));

      return widget({
        props: { memories, view: "memories" as const },
        output: text(
          `${files.length} item(s) in ${path || "/"}:\n${files.map((f) => `  ${f.type === "directory" ? "📁" : "📄"} ${f.name}${f.type === "file" ? ` (${f.size}b)` : ""}`).join("\n")}`
        ),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return text(`Failed to list files: ${message}`);
    }
  }
);

// ── 4. read-file ────────────────────────────────────────────────────
server.tool(
  {
    name: "read-file",
    description: "Read a file from the shared DeepLake memory.",
    schema: z.object({
      path: z.string().describe("File path relative to root"),
    }),
  },
  async ({ path }) => {
    const fullPath = join(DEEPLAKE_MOUNT, path);
    try {
      const content = await readFile(fullPath, "utf-8");
      return text(`**${path}:**\n\n${content}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return text(`Failed to read file: ${message}`);
    }
  }
);

// ── 5. write-file ───────────────────────────────────────────────────
server.tool(
  {
    name: "write-file",
    description:
      "Write a file to the shared DeepLake memory. All connected agents see it instantly.",
    schema: z.object({
      path: z
        .string()
        .describe("File path relative to root (e.g. 'notes/todo.md')"),
      content: z.string().describe("Content to write"),
    }),
  },
  async ({ path, content }) => {
    const fullPath = join(DEEPLAKE_MOUNT, path);
    try {
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir && dir !== DEEPLAKE_MOUNT) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(fullPath, content, "utf-8");
      return text(
        `Written ${content.length} bytes to ${path}. All agents can now see this file.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return text(`Failed to write file: ${message}`);
    }
  }
);

// ── 6. search-memory ────────────────────────────────────────────────
server.tool(
  {
    name: "search-memory",
    description:
      "Search across all memories by text content. Queries the DeepLake database directly.",
    schema: z.object({
      query: z.string().describe("Text to search for"),
      limit: z.number().optional().describe("Max results (default 20)"),
    }),
    widget: {
      name: "memory-dashboard",
      invoking: "Searching memories...",
      invoked: "Search complete",
    },
  },
  async ({ query, limit }) => {
    try {
      const cfg = loadDeepLakeConfig();
      if (!cfg) {
        return text("DeepLake credentials not found.");
      }

      const escapedQuery = query.replace(/'/g, "''");
      const maxResults = limit || 20;
      const sql = `SELECT path, content_text, size_bytes, updated_at FROM "${cfg.tableName}" WHERE content_text ILIKE '%${escapedQuery}%' ORDER BY updated_at DESC LIMIT ${maxResults}`;

      const result = await queryDeepLake(sql);
      const columns = result.columns || [];
      const rows = result.rows || [];

      const memories = rows.map((row, i) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, j) => {
          obj[col] = row[j];
        });
        return {
          id: `search-${i}`,
          content: `📄 ${obj.path}\n${String(obj.content_text || "").substring(0, 200)}`,
          source: "DeepLake Search",
          timestamp: String(obj.updated_at || ""),
          tags: [query],
        };
      });

      return widget({
        props: { memories, view: "memories" as const },
        output: text(
          rows.length === 0
            ? `No results for "${query}".`
            : `Found ${rows.length} result(s) for "${query}":\n\n${rows
                .map((row, i) => {
                  const path = row[columns.indexOf("path")];
                  const content = String(
                    row[columns.indexOf("content_text")] || ""
                  ).substring(0, 150);
                  return `[${i + 1}] ${path}\n  ${content}`;
                })
                .join("\n\n")}`
        ),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return text(`Search failed: ${message}`);
    }
  }
);

// ── Start ────────────────────────────────────────────────────────────
server.listen().then(() => {
  console.log(
    `Memory CP server running (auth: ${MCP_API_KEY ? "enabled" : "disabled - set MCP_API_KEY to secure"})`
  );
  console.log(`DeepLake mount: ${DEEPLAKE_MOUNT}`);
  const cfg = loadDeepLakeConfig();
  if (cfg) {
    console.log(`DeepLake API: ${cfg.apiUrl} | table: ${cfg.tableName}`);
  }
});
