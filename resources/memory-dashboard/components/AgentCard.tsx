import React from "react";
import type { Agent } from "../types";

const statusConfig = {
  online: { dot: "bg-emerald-400", label: "Online", ring: "ring-emerald-400/20" },
  offline: { dot: "bg-zinc-400", label: "Offline", ring: "ring-zinc-400/20" },
  working: { dot: "bg-amber-400 animate-pulse", label: "Working", ring: "ring-amber-400/20" },
};

interface AgentCardProps {
  agent: Agent;
  onSendTask: (agentId: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSendTask }) => {
  const status = statusConfig[agent.status];

  return (
    <div className="rounded-2xl border border-default bg-surface p-4 flex flex-col gap-3 min-w-[180px]">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${status.dot} ring-4 ${status.ring}`} />
        <span className="font-semibold text-sm text-default truncate">{agent.name}</span>
      </div>
      <div className="text-xs text-secondary">
        {status.label}
        {agent.lastActivity && (
          <span className="ml-1 opacity-60">
            {new Date(agent.lastActivity).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <button
        onClick={() => onSendTask(agent.id)}
        className="mt-auto px-3 py-1.5 text-xs font-medium rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors cursor-pointer"
      >
        Send Task
      </button>
    </div>
  );
};
