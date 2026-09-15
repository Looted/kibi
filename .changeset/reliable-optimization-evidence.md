---
"kibi-cli": patch
"kibi-mcp": patch
---

Kibi CLI now preserves quoted Prolog text and large structured responses when reading optimization evidence. This prevents Unicode, escape sequences, nested metadata, and pipe-delivered JSON from being silently corrupted or truncated during SkillOpt evaluations.

- Harden Prolog response parsing and atom/string escaping.
- Normalize entity endpoints at graph and quality-evidence callers.
- Wait for stdout backpressure before completing JSON CLI operations.
