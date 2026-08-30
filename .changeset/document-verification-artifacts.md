---
"kibi-cli": patch
---

Consumers can now discover and prepare proof evidence without reverse-engineering the reporter or ingestion implementation. Kibi publishes the complete verification-artifact contract, validates reporter output consistently, and provides a single guide for `kibi verify`, MCP ingestion, test contracts, and receipt freshness.

- Export the shared `kibi.playwright-run.v1` artifact schema and actionable validation errors.
- Document the proof workflow in the CLI, MCP reference, README, entity schema, and bundled usage skill.
- Add schema-validated verification examples and parity coverage for reporter output and MCP operation metadata.
