---
"kibi-mcp": patch
---

Fixed `kb_job_status` crashing with "Cannot read properties of undefined (reading '_zod')" on every call. The tool's annotations object was passed one parameter slot too far and landed in the output-schema slot, so the MCP server advertised a bogus output schema and the SDK's output validator crashed before returning the job state. The background-job polling flow (`kb_check` with `async: true` followed by `kb_job_status`) now works end to end, and the tool's annotations (title, read-only hints) are actually published on `tools/list`.

- Pass the `kb_job_status` annotations in the `annotations` parameter of `addTool` instead of the `outputSchema` parameter.
- Pin the call contract with an MCP round-trip test (unknown job returns a typed `kibi.job.v1` receipt; annotations appear on `tools/list`).
