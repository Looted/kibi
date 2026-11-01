---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
---

Usage telemetry events now carry a `channel`: `release` for an installed Kibi package, `source` when Kibi runs from a checkout of its own repository, or the value of `KIBI_TELEMETRY_CHANNEL` when a harness sets one (for example `agent-test`). Development and test runs can then be filtered out of real usage. Nothing else about what is sent changes.
