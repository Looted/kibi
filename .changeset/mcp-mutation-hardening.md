---
"kibi-mcp": patch
---

Usage telemetry and diagnostics now name a `kb_model` or `kb_skills` call by its own tool when its `mode` or `action` is not a known one, including names such as `constructor` that were wrongly resolved through object properties. Internal MCP adapters were otherwise simplified with no change in behaviour, and their tests now pin exact outputs.
