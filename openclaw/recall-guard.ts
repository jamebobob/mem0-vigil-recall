/**
 * Recall Guard (Vigil A2)
 *
 * Filters recall results by session context before injection into the
 * agent prompt. Prevents private DM memories from leaking into group
 * chat, cron jobs, or social agent context.
 *
 * Three modes (per context):
 *   - allow-all (dm): all results pass, no filtering.
 *   - deny-private (group): results with is_private=true are removed.
 *     If allowed_pools is set, results from unlisted pools are also removed.
 *   - deny-private (cron): same as group but without pool allowlist.
 *
 * Separate file from telemetry for independent revert capability.
 */

import { readFileSync, existsSync } from "node:fs";
import defaultConfig from "./memory-views.default.json" with { type: "json" };

export interface MemoryViewConfig {
  views: Record<string, {
    mode: "allow-all" | "deny-private";
    allowed_pools?: string[];
  }>;
}

export interface GuardableResult {
  id: string;
  memory: string;
  score?: number;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface GuardOutput<T extends GuardableResult> {
  results: T[];
  removedCount: number;
}

/**
 * Load memory-views config from a runtime path, falling back to the
 * bundled default if the file doesn't exist or can't be parsed.
 */
export function loadMemoryViewsConfig(
  resolvePath?: (p: string) => string,
): MemoryViewConfig {
  if (resolvePath) {
    try {
      const runtimePath = resolvePath("memory-views.json");
      if (existsSync(runtimePath)) {
        const raw = readFileSync(runtimePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed?.views && typeof parsed.views === "object") {
          return parsed as MemoryViewConfig;
        }
      }
    } catch {
      // Fall through to default
    }
  }
  return defaultConfig as MemoryViewConfig;
}

/**
 * Apply the recall guard to a set of search results.
 *
 * Returns the filtered results and the count of removed items (for
 * the telemetry module's filtered_by_guard field).
 */
export function applyRecallGuard<T extends GuardableResult>(opts: {
  results: T[];
  ctx: string; // "dm" | "group" | "cron"
  config: MemoryViewConfig;
}): GuardOutput<T> {
  const { results, ctx, config } = opts;
  const view = config.views[ctx];

  // Unknown context or allow-all: pass everything through
  if (!view || view.mode === "allow-all") {
    return { results, removedCount: 0 };
  }

  // deny-private mode
  const filtered = results.filter((r) => {
    // Filter out results marked as private
    if (r.metadata?.is_private === true) return false;

    // If allowed_pools is set, filter out results from unlisted pools
    if (view.allowed_pools && r.user_id) {
      if (!view.allowed_pools.includes(r.user_id)) return false;
    }

    return true;
  });

  return {
    results: filtered,
    removedCount: results.length - filtered.length,
  };
}
