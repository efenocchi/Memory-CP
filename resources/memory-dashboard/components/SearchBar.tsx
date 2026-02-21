import React, { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isSearching }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 relative">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary opacity-50"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-default bg-surface text-default placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-info/30"
        />
      </div>
      <button
        type="submit"
        disabled={isSearching || !query.trim()}
        className="px-4 py-2 text-sm font-medium rounded-xl bg-info text-white hover:bg-info/90 disabled:opacity-40 transition-colors cursor-pointer"
      >
        {isSearching ? "..." : "Search"}
      </button>
    </form>
  );
};
