# mem0-vigil-recall

A fork of [mem0ai/mem0](https://github.com/mem0ai/mem0) that fixes what we found after running mem0 in production for 32 days and reading every entry it created.

## The short version

We ran mem0 with one AI agent, one human, daily conversations, Qdrant backend. Two extraction models: gemma2:2b (local, first 20 days) then Claude Sonnet 4.6 (last 12). After the agent started "remembering" things nobody ever said, we audited the entire collection.

10,134 entries. 97.8% were junk. Hallucinated facts, credential fragments, duplicate entries with minor rewording, system prompts stored as memories. Only 38 entries in the whole collection were clean enough to keep as written. The rest were deleted or rewritten from scratch.

The full audit methodology and findings are documented in [mem0ai/mem0#4573](https://github.com/mem0ai/mem0/issues/4573).

This fork contains every fix we built along the way.

## What's different from upstream

### Core SDK patches

Seven patches to the mem0 TypeScript OSS SDK. Corresponding upstream PRs sit in a months-long backlog.

| Patch | What it fixes |
|-------|---------------|
| **Score threshold passthrough** | `search()` accepts a threshold parameter but never forwards it to Qdrant. Every search returns the full result set regardless of relevance. Two patches wire `score_threshold` through both layers: from the `QdrantVectorStore.search()` method to the actual Qdrant query, and from `Memory.search()` down to the vector store. |
| **MD5 hash dedup** | Identical text gets stored as separate entries because `createMemory()` has no duplicate check. This adds an MD5 hash gate that catches exact matches before they hit the vector store. |
| **Cosine similarity dedup** | Near-identical text (minor rewording, same meaning) also creates duplicates. This adds a cosine similarity check against existing entries before insert. Catches what hash dedup misses. |
| **JSON extraction fallback** | When the LLM wraps its response in markdown code fences, `removeCodeBlocks()` fails to extract the JSON. Memories get silently dropped. This adds a fallback parser with input scoping to avoid false positives on code-heavy content. |
| **Anthropic max_tokens bump** | The Anthropic LLM adapter hardcodes `max_tokens: 4096`. Complex extractions get truncated mid-sentence and stored as broken fragments. Bumped to 8192. |
| **Embedding dimension auto-detect** | When using a non-OpenAI embedder, Qdrant throws a dimension mismatch because the SDK assumes OpenAI's embedding size. This patch auto-detects the actual dimension from the configured embedder. |

### Multi-pool memory isolation

Upstream mem0 uses a single flat namespace. Every agent reads and writes the same pool. If you run multiple agents (say, one for private DMs and several for group contexts), they all share memories with no boundaries.

This fork adds configurable named pools via an `agentMemory` config block. Each agent gets a capture pool (where it writes) and a recall list (where it reads). A boundary enforcement function prevents agents from accessing pools they're not configured for.

The main agent can read all pools. Group agents only see their own. No code changes needed in the calling application: pool routing is handled inside the plugin based on agent identity.

### Vigil modules (3 independent modules)

Built during the audit to understand what was going wrong and prevent it from happening again.

**Recall telemetry** logs every memory recall event to a JSONL file with timestamps, query text, result count, scores, and session context. Also detects recall gaps (queries that returned zero results) and logs them to a separate gap journal. This is how we discovered that the agent was recalling hallucinated content: the telemetry showed high-confidence scores on entries that didn't correspond to any real conversation.

**Capture filter** restricts auto-capture to user-role messages only. Without this, system messages, compaction artifacts, and LLM context management summaries all get extracted as "memories." This was the single biggest source of junk in our audit: the system talking to itself and mem0 dutifully recording every word.

**Recall guard** filters search results by privacy context. A memory captured in a private DM doesn't surface in a group chat. A group memory doesn't leak into a different group. Context-aware, not keyword-based.

Each module is in its own file with its own test suite. Any one of them can be disabled by removing a single import without touching the others.

### Documentation

- **DEPLOY.md**: Step-by-step deployment guide with rollback plan
- **CONTRIBUTING.md**: Multi-pool architecture overview, module guide, and documented anti-patterns (things we tried or evaluated and decided against, with reasons)
- **CHANGELOG.md**: Version history for the OpenClaw plugin

## Test suite

53 TypeScript tests covering config validation, multi-pool routing, capture filtering, recall guard boundaries, telemetry output, and SQLite resilience. 9 Python tests for the never-recalled cleanup report generator.

