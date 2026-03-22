---
"kibi-opencode": patch
---

Clarify MCP-only agent guidance policy

Documentation now consistently describes the agent-facing interface as public MCP tools and sanctioned slash commands, with internal maintenance handled by background sync operations. This aligns with ADR-016 thin-bridge architecture where agents interact exclusively through the MCP surface while internal processes manage KB synchronization.
