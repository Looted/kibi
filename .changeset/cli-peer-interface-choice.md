---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.

- Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
- Update OpenCode prompt injection, enforcement, and init-kibi guidance.
- Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
- Re-sync the Cursor and Codex skill bundles.
