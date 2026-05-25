---
"kibi-opencode": patch
---

OpenCode hard mode now surfaces a clear stop-state in the prompt when authoritative files are dirty and the Kibi checkpoint has not been satisfied. Agents see deterministic MCP-only recovery steps instead of advisory guidance, while non-authoritative workspaces continue without a hard block.

Technical summary:
- Add hard-gate prompt rendering with bounded affected paths and public MCP tool instructions.
- Thread hard-mode file-operation policy results through the plugin prompt transform and preserve non-authoritative skip behavior.
- Cover hard-block and no-block behavior in prompt and hook contract tests.
