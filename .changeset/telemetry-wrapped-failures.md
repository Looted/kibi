---
"kibi-agent-core": patch
"kibi-cli": patch
"kibi-mcp": patch
---

Telemetry now names the error underneath a plain wrapper such as "Upsert execution failed: …": the event carries the wrapped error's code, class and crash frame instead of a generic `operation_failed` from the wrapper. The engine client also stops waiting when the daemon it started exits without listening (reporting `ENGINE_START_FAILED` with the exit code or signal after a one-second grace, instead of waiting out the two-minute start timeout), and a start that does time out reports `ENGINE_CONNECT_TIMEOUT` instead of an uncategorized error.
