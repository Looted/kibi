---
"kibi-opencode": patch
---

OpenCode sessions are now more resilient to transient background failures and idle timeouts. The plugin automatically suppresses repetitive background sync attempts after a persistent failure is detected, while ensuring manual developer actions still trigger fresh attempts to recover.

- Implement background sync suppression after latched operational failures to prevent log noise during idle periods.
- Add diagnostic metadata to sync failure payloads for improved observability.
- Ensure manual edits and tool executions bypass idle suppression to allow for graceful recovery.
- Restore standard operational sync behavior once the workspace state is resolved.
