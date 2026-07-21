---
"kibi-cli": minor
"kibi-mcp": patch
---

Operators can now run semantic requirement analysis through the dedicated `semantic-advisor --input` CLI route with the same JSON contract and deterministic suggestions as MCP. MCP and upsert analysis now reuse the shared CLI implementation, so ambiguity witnesses and modeling advice stay aligned without starting Prolog.

- Move semantic-advisor analysis, types, coverage evaluation, and execution into size-bounded `kibi-cli` modules.
- Replace the MCP semantic-advisor implementation with a thin shared-executor adapter and update upsert imports.
