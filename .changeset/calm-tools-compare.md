---
"kibi-cli": patch
"kibi-mcp": patch
---

CLI and MCP operation changes now have an executable semantic parity safety net. Contributors get immediate failures when an operation is missing, duplicated, or returns transport-specific business data.

- Add isolated seeded workspace fixtures for all 18 catalog operations.
- Compare CLI JSON and in-memory MCP results after narrowly scoped volatile-field normalization.
- Enforce exact catalog-to-parity-case registry completeness.
