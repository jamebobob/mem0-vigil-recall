# mem0-vigil-recall

**Archived April 2026.** This is a retrospective. The repo is preserved as a reference, not an active fork.

## What this was

A fork of [mem0ai/mem0](https://github.com/mem0ai/mem0) with per-agent memory isolation, a vigil pass against collection drift, and some recall tuning on top. Ran in production for 32 days on a personal AI agent (Feb 23 to Mar 26, 2026). Two extraction models across that window: gemma2:2b on Ollama for the first 20 days, then Claude Sonnet 4.6 for the last 12.

## What we concluded

We audited the full 10,134-entry collection. 97.8% of the entries were junk. The batch-by-batch breakdown, the categories of junk we hit, the comparison across the two extraction models, and what we tried before giving up are all in [mem0ai/mem0#4573](https://github.com/mem0ai/mem0/issues/4573).

That thread also has the conversation it kicked off. People showed up, pushed back on parts of our framing, added their own observations and counter-framings. Worth reading in full if you're evaluating mem0 for production.

## Where the work went

After concluding mem0 wouldn't work for this setup, the pile of technical debt on the OpenClaw stack made a clean rebuild more attractive than another patch cycle. The memory work moved to [Hermes](https://github.com/hermes-agent/hermes-agent) (still retrieval, but without the extraction pipeline that produced most of the junk) plus contributions to [gbrain](https://github.com/garrytan/gbrain) for the structured knowledge side. See [the profile](https://github.com/jamebobob) for what's current.

## Why this repo is still public

The retrospective is the value. If you're considering a similar mem0 deployment, the audit data in #4573 and the code here (per-agent isolation, the vigil pass, the recall tuning) might save you some of the 32 days we spent figuring this out. No warranty, no claim of being right. Just the record.
