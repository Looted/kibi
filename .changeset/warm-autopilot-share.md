---
"kibi-cli": patch
"kibi-mcp": patch
---

Autopilot bootstrap synthesis now returns the same deterministic candidates, payoff guidance, and exact review-only apply plans through CLI JSON and MCP. Cold-start analysis no longer launches Prolog unnecessarily, making scripted bootstrap previews faster while preserving confidence and candidate safety bounds.

- Share port-backed autopilot discovery, candidate construction, and result generation in `kibi-cli`.
- Route `autopilot-generate --input` and `kb_autopilot_generate` through the same executor and parity harness.
