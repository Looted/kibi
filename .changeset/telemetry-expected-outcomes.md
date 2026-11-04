---
"kibi-agent-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

Telemetry now tells refusals apart from faults. An operation that Kibi refused on purpose (an invalid upsert payload, check findings, a semantic contradiction, a firm decision, a missing entity) is sent with status `rejected` and its fixed error code, and `error` is kept for Kibi's own failures, which also carry the JavaScript class name of the thrown error but never its message. The CLI now keeps the code of mutation refusals instead of reporting them as `operation_failed`. Every event carries `telemetry_version: 2`.
