---
"kibi-cli": patch
---

Prolog errors now cross the runtime boundary as structured terms instead of flattened text. When a KB mutation fails — a stale snapshot, a locked audit journal, a contradiction, a missing entity, or an invalid relationship — the CLI classifies the actual Prolog error term rather than pattern-matching SWI-Prolog's human-readable output, so error messages can no longer be misclassified by coincidental words in diagnostics. The public query results additionally carry a typed `errorRecord` field (code, entity id, relationship triple, contradiction conflicts) that surfaces like MCP can rely on, and user-facing error text is unchanged.
