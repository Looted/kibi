---
"kibi-mcp": minor
---

Long KB validation no longer dies at the tool timeout. `kb_check` accepts `async: true`: instead of holding the request until `KIBI_MCP_TOOL_TIMEOUT_MS` expires — which on large knowledge bases meant the CLI succeeding in seconds while the same check timed out at the MCP layer — the tool returns a `kibi.job.v1` receipt immediately and the check runs in a detached job. Poll the new `kb_job_status` tool with the returned `jobId` until it reports `succeeded` (full result envelope included) or `failed` (error message included). Jobs are process-local by design: bounded in-memory history, not persisted, dropped on server restart, so a stale `jobId` answers `unknown` with that explanation rather than a mystery error.

Technical summary: `server/jobs.ts` adds the bounded job registry (`startJob`/`getJob`/`jobSnapshot`, oldest-finished eviction at 32); `tool-registration.ts` detaches `kb_check` into a job when `args.async === true`, keeping the synchronous path untouched; `registerAllTools` registers `kb_job_status` as an MCP-server-native companion outside the canonical operation catalog; `checkSpec` gains the documented `async` flag and frozen contract fixtures are regenerated.
