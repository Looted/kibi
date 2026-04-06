---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-opencode": minor
---

feat(traceability): document comment-free test workflow with validation parity

- Add relationship-first traceability guidance: prefer symbol/test/requirement relationships via `covered_by` and `verified_by`/`validates` over inline `// implements REQ-xxx` comments
- Document staged symbol traceability enforcement with both workflow paths: relationship-based (preferred) and comment-based (optional/backward-compatible)
- Align guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
- Staged enforcement now supports explicit KB relationships in addition to inline comments
- Document scope boundary: automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged check
