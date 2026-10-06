---
"kibi-mcp": patch
---

Installing `kibi-mcp` no longer pulls in `mcpcat` and its OpenTelemetry and protobufjs tree. The server stopped using `mcpcat` in March, so nothing changes at runtime; installs are smaller and no longer carry the OpenTelemetry Core and protobufjs advisories that Snyk and `bun audit` reported.

Technical summary: removed the unused `mcpcat` dependency from `packages/mcp/package.json`.
