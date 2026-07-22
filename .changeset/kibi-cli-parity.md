---
"kibi-cli": minor
---

Kibi CLI now exposes all 18 MCP operations as peer public routes with exact JSON input/output, enabling agents to use either interface. Agents and automation can choose the transport their environment supports without losing operation coverage or contract fidelity.

- Added a transport-neutral operation catalog.
- Added dedicated CLI commands for upsert, delete, semantic-advisor, model-requirement, suggest-predicates, autopilot-generate, sparql-remote, and validate-upsert.
- Added a cross-surface parity harness.
