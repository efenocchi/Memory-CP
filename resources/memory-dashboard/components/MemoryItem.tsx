import React from "react";
import type { Memory } from "../types";

interface MemoryItemProps {
  memory: Memory;
  onAskMore: (memory: Memory) => void;
}

export const MemoryItem: React.FC<MemoryItemProps> = ({ memory, onAskMore }) => {
  const time = new Date(memory.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-default bg-surface p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-default leading-relaxed line-clamp-3">
          {memory.content}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-secondary">{memory.source}</span>
        <span className="text-xs text-secondary opacity-50">{time}</span>
        {memory.tags?.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-info/10 text-info"
          >
            {tag}
          </span>
        ))}
      </div>
      <button
        onClick={() => onAskMore(memory)}
        className="self-start px-3 py-1 text-xs font-medium rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors cursor-pointer"
      >
        Ask Claude →
      </button>
    </div>
  );
};
