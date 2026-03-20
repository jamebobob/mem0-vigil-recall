/**
 * Tests for the openclaw-mem0 plugin config schema, including
 * agentMemory multi-pool configuration parsing.
 *
 * Note: extractSessionInfo, getCapturePool, getRecallPools, and
 * isPoolAllowed are closures inside register() and cannot be tested
 * directly. Their behavior is validated through integration tests.
 * These unit tests cover the config parsing layer that feeds them.
 */
import { describe, it, expect } from "vitest";
import { mem0ConfigSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Config schema: agentMemory parsing
// ---------------------------------------------------------------------------
describe("mem0ConfigSchema agentMemory", () => {
  const base = {
    mode: "open-source" as const,
    userId: "jamebob",
  };

  it("parses agentMemory with capture and recall arrays", () => {
    const cfg = mem0ConfigSchema.parse({
      ...base,
      agentMemory: {
        main: { capture: "jamebob", recall: ["jamebob", "family"] },
        social: { capture: "family", recall: ["family"] },
      },
    });
    expect(cfg.agentMemory).toEqual({
      main: { capture: "jamebob", recall: ["jamebob", "family"] },
      social: { capture: "family", recall: ["family"] },
    });
  });

  it("defaults capture to userId when not specified", () => {
    const cfg = mem0ConfigSchema.parse({
      ...base,
      agentMemory: {
        main: { recall: ["jamebob"] },
      },
    });
    expect(cfg.agentMemory?.main.capture).toBe("jamebob");
  });

  it("defaults recall to [userId] when not specified", () => {
    const cfg = mem0ConfigSchema.parse({
      ...base,
      agentMemory: {
        main: { capture: "jamebob" },
      },
    });
    expect(cfg.agentMemory?.main.recall).toEqual(["jamebob"]);
  });

  it("returns undefined agentMemory when not provided", () => {
    const cfg = mem0ConfigSchema.parse(base);
    expect(cfg.agentMemory).toBeUndefined();
  });

  it("returns undefined agentMemory for empty object", () => {
    const cfg = mem0ConfigSchema.parse({ ...base, agentMemory: {} });
    expect(cfg.agentMemory).toBeUndefined();
  });

  it("skips non-object entries in agentMemory", () => {
    const cfg = mem0ConfigSchema.parse({
      ...base,
      agentMemory: {
        main: { capture: "jamebob", recall: ["jamebob"] },
        bad: "not-an-object",
        worse: null,
      },
    });
    expect(cfg.agentMemory).toEqual({
      main: { capture: "jamebob", recall: ["jamebob"] },
    });
  });

  it("filters non-string entries from recall array", () => {
    const cfg = mem0ConfigSchema.parse({
      ...base,
      agentMemory: {
        main: { capture: "jamebob", recall: ["jamebob", 42, null, "family"] },
      },
    });
    expect(cfg.agentMemory?.main.recall).toEqual(["jamebob", "family"]);
  });
});

// ---------------------------------------------------------------------------
// Config schema: ALLOWED_KEYS includes agentMemory
// ---------------------------------------------------------------------------
describe("mem0ConfigSchema allowed keys", () => {
  it("accepts agentMemory as a valid config key", () => {
    expect(() =>
      mem0ConfigSchema.parse({
        mode: "open-source",
        userId: "test",
        agentMemory: { main: { capture: "test", recall: ["test"] } },
      }),
    ).not.toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      mem0ConfigSchema.parse({
        mode: "open-source",
        userId: "test",
        badKey: true,
      }),
    ).toThrow(/unknown keys.*badKey/);
  });
});
