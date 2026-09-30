---
"kibi-mcp": patch
"kibi-cli": patch
"kibi-runtime": patch
---

Usage telemetry now records what a call actually returned. Since mid-August every MCP tool result was logged with a count of zero, so a search that returned 190 hits looked identical to one that found nothing, and acceptance reports drew conclusions from fabricated data. Result and violation counts are now read correctly, and a payload that genuinely cannot be parsed is recorded as unknown rather than as an empty result, so a broken logger can no longer look like a healthy but empty knowledge base.

- Add `normalizeResultPayload` to the result-envelope module and use it in both the MCP and CLI diagnostic loggers, resolving the `{ structuredContent }` wrapper and the bare `kibiProtocol` envelope through one contract.
- Record `result_count` and `violation_count` as `null` with a `count unavailable` summary when no payload is readable, and omit `zero_results` in that case.
- Restore `protocol_version`, `result_version`, `result_status`, and `effect_failures` on MCP rows, and fix the mirrored CLI case where a wrapped envelope logged protocol fields but lost the count.
- Treat unreadable counts as `insufficient_evidence` in the source-lookup acceptance metric instead of silently counting them as non-zero hits.
- Cover the boundary with an end-to-end test through the real MCP tool registration and logger path; the previous helper-level tests passed throughout the outage.
