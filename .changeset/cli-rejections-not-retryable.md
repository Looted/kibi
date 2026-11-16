---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

A refused CLI JSON call no longer tells the agent to retry it. Every KB rejection (validation failures, contradictions, firm-decision locks, missing relationship endpoints) and every refusal with its own code now reports `retryable: false`, so agents fix the input instead of resending the same call.

- The CLI JSON route reports a thrown `KbRejection`, directly or as the cause of a wrapping error, as `OPERATION_FAILED` with `retryable: false`. An unexplained failure stays `retryable: true`.
- `OperationError` is not retryable unless the code that throws it says so. `SOURCE_PATH_INVALID`, `SOURCE_FORMAT_INVALID`, `SOURCE_FORMAT_UNSUPPORTED`, `SOURCE_ENTITY_MISMATCH`, `DOCUMENT_PATH_REQUIRED`, `PROTOCOL_VALIDATION_FAILED` and `PROLOG_UNAVAILABLE` now report `retryable: false`. `SOURCE_MUTATION_LOCK_TIMEOUT` and `WORKSPACE_SNAPSHOT_UNAVAILABLE` stay retryable.
- An `OperationError` from a bundled copy without a `retryable` field reads as not retryable on MCP too.
