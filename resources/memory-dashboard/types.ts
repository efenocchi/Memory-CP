import { z } from "zod";

export const propSchema = z.object({
  agents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(["online", "offline", "working"]),
        lastActivity: z.string().optional(),
      })
    )
    .optional(),
  memories: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        source: z.string(),
        timestamp: z.string(),
        tags: z.array(z.string()).optional(),
      })
    )
    .optional(),
  taskResult: z
    .object({
      agentId: z.string(),
      status: z.string(),
      message: z.string(),
    })
    .optional(),
  view: z.enum(["dashboard", "memories", "task-sent"]).default("dashboard"),
});

export type MemoryDashboardProps = z.infer<typeof propSchema>;

export interface Agent {
  id: string;
  name: string;
  status: "online" | "offline" | "working";
  lastActivity?: string;
}

export interface Memory {
  id: string;
  content: string;
  source: string;
  timestamp: string;
  tags?: string[];
}

export interface TaskResult {
  agentId: string;
  status: string;
  message: string;
}
