import React from "react";
import type { Memory } from "../types";
import { MemoryItem } from "./MemoryItem";

interface MemoryFeedProps {
  memories: Memory[];
  onAskMore: (memory: Memory) => void;
}

export const MemoryFeed: React.FC<MemoryFeedProps> = ({ memories, onAskMore }) => {
  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-secondary">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="opacity-30 mb-2"
        >
          <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7l-1 1.5V20h-4v-2.5L9 16c-2-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
          <line x1="10" y1="20" x2="14" y2="20" />
          <line x1="10" y1="22" x2="14" y2="22" />
        </svg>
        <p className="text-sm">No memories yet</p>
        <p className="text-xs opacity-60">Use write-memory or query-memory to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
      {memories.map((memory) => (
        <MemoryItem key={memory.id} memory={memory} onAskMore={onAskMore} />
      ))}
    </div>
  );
};
