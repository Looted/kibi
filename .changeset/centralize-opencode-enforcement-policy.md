---
"kibi-opencode": minor
---

OpenCode guidance now uses one lifecycle enforcement policy for created, edited, and deleted relevant files. In hard mode, authoritative Kibi roots get a single aggregated checkpoint block that tells agents exactly which MCP tools to use before continuing, including sourceFile cleanup guidance for deleted files with no linked IDs.

Technical summary:
- Add a pure enforcement-policy module with advisory, hard-block, skip, and checkpoint-passed decisions.
- Route file-operation reminders through the policy and cover edited-file, deletion, non-authoritative, and aggregation cases with focused tests.
