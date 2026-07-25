---
"kibi-cli": patch
---

Broad Kibi searches now return ranked results even when the serialized entity set is larger than the subprocess runtime's former default output capacity. Searches that exceed Kibi's explicit safety bound now report a clear bounded-capacity failure instead of returning truncated output or a misleading generic Prolog error. Graph, status, and other JSON reporting commands now also load their Prolog module correctly in fresh Node CLI and MCP sessions.

- Bound one-shot and interactive Node Prolog stdout and stderr capture at 8 MiB, and require a complete response terminator before parsing, while preserving query timeouts and ranking-before-pagination.
- Translate `ENOBUFS` into a deterministic nonempty query error shared by CLI and MCP discovery paths.
- Reject negative pagination and search queries above 4,096 characters through the existing typed input-validation boundary.
- Load reporting modules before executing module-qualified goals in interactive Prolog sessions.
