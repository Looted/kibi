---
"kibi-mcp": patch
---

Fix `kb_autopilot_generate` workspace discovery so it respects env-provided workspace roots, excludes vendored markdown trees during generic scanning, and returns zero candidates for vendored-only temporary repos.
