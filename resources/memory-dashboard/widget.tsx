import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React from "react";
import { Link } from "react-router";
import "../styles.css";
import { AgentCard } from "./components/AgentCard";
import { MemoryFeed } from "./components/MemoryFeed";
import { SearchBar } from "./components/SearchBar";
import type { MemoryDashboardProps, Memory } from "./types";
import { propSchema } from "./types";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import {
  Expand,
  PictureInPicture,
} from "@openai/apps-sdk-ui/components/Icon";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Memory CP dashboard showing connected agents, shared memories, and task status",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading Memory CP...",
    invoked: "Memory CP loaded",
  },
};

type PinnedState = { pinned: string[] };

const MemoryDashboard: React.FC = () => {
  const {
    props,
    isPending,
    displayMode,
    requestDisplayMode,
    sendFollowUpMessage,
    state,
    setState,
  } = useWidget<MemoryDashboardProps, PinnedState>();

  const {
    callTool: sendTask,
    isPending: isSendingTask,
  } = useCallTool("send-task");

  const {
    callTool: searchMemories,
    isPending: isSearching,
  } = useCallTool("search-memory");

  const pinned = state?.pinned ?? [];

  const togglePin = (memoryId: string) => {
    const next = pinned.includes(memoryId)
      ? pinned.filter((id: string) => id !== memoryId)
      : [...pinned, memoryId];
    setState({ pinned: next });
  };

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="relative bg-surface-elevated border border-default rounded-3xl">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info">
                  <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7l-1 1.5V20h-4v-2.5L9 16c-2-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
                  <line x1="10" y1="20" x2="14" y2="20" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-default">Memory CP</h2>
                <p className="text-xs text-secondary">Loading...</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-default/5 animate-pulse" />
              <div className="h-20 rounded-xl bg-default/5 animate-pulse" />
            </div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { agents, memories, taskResult, view } = props;
  const isFullscreen = displayMode === "fullscreen";
  const isPip = displayMode === "pip";

  const handleSendTask = (agentId: string) => {
    sendTask({ agentId, task: "Report your current status and recent work" });
  };

  const handleSearch = (query: string) => {
    searchMemories({ query });
  };

  const handleAskMore = (memory: Memory) => {
    sendFollowUpMessage(`Tell me more about this memory: ${memory.content.slice(0, 200)}`);
  };

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="relative bg-surface-elevated border border-default rounded-3xl">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {pinned.length > 0 && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-info/10 text-info">
                {pinned.length} pinned
              </span>
            )}
            {!isFullscreen && !isPip && (
              <>
                <Button
                  color="secondary"
                  pill
                  size="lg"
                  uniform
                  variant="outline"
                  onClick={() => requestDisplayMode("pip")}
                  title="Picture-in-picture"
                >
                  <PictureInPicture />
                </Button>
                <Button
                  color="secondary"
                  pill
                  size="lg"
                  uniform
                  variant="outline"
                  onClick={() => requestDisplayMode("fullscreen")}
                  title="Fullscreen"
                >
                  <Expand />
                </Button>
              </>
            )}
            {(isFullscreen || isPip) && (
              <Button
                color="secondary"
                pill
                size="lg"
                uniform
                variant="outline"
                onClick={() => requestDisplayMode("inline")}
                title="Exit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            )}
          </div>

          {/* Header */}
          <div className="p-6 pb-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info">
                  <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7l-1 1.5V20h-4v-2.5L9 16c-2-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
                  <line x1="10" y1="20" x2="14" y2="20" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-default">Memory CP</h2>
                <p className="text-xs text-secondary">Collaborative AI Memory</p>
              </div>
            </div>
          </div>

          {/* Task Result Banner */}
          {view === "task-sent" && taskResult && (
            <div className="mx-6 mb-3">
              <div
                className={`rounded-xl p-4 ${
                  taskResult.status === "completed"
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-danger/10 border border-danger/20"
                }`}
              >
                <p className={`text-sm font-medium ${taskResult.status === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-danger"}`}>
                  {taskResult.status === "completed" ? "Task Completed" : "Task Failed"}
                </p>
                <p className="text-xs text-secondary mt-1">{taskResult.message}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="px-6 pb-6">
            {(view === "dashboard" || agents?.length) && (
              <>
                {/* Agents Section */}
                {agents && agents.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-secondary uppercase tracking-wide mb-2">
                      Agents ({agents.length})
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {agents.map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          onSendTask={handleSendTask}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No agents message */}
                {(!agents || agents.length === 0) && view === "dashboard" && (
                  <div className="rounded-xl border border-default bg-surface p-6 text-center mb-4">
                    <p className="text-sm text-secondary">No agents configured</p>
                    <p className="text-xs text-secondary/60 mt-1">
                      Set OPENCLAW_SERVERS env var to connect agents
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Memory Feed */}
            {(view === "memories" || (memories && memories.length > 0)) && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-secondary uppercase tracking-wide mb-2">
                  Memories ({memories?.length ?? 0})
                </h3>
                <MemoryFeed
                  memories={memories ?? []}
                  onAskMore={handleAskMore}
                />
              </div>
            )}

            {/* Search */}
            <SearchBar onSearch={handleSearch} isSearching={isSearching || isSendingTask} />
          </div>
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default MemoryDashboard;
