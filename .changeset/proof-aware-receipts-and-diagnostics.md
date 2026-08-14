---
"kibi-cli": patch
"kibi-core": patch
"kibi-mcp": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Agents now get consistent guidance when execution proof, structural coverage, and KB freshness disagree. Current-contract E2E evidence is recorded as v2 without rewriting history, and full checks no longer report a contradictory weak-depth warning when the same live receipt already proves the scenario-backed test. Receipt freshness repairs also identify the affected requirements and tests so agents can rerun the exact contract.

- Share snapshot-bound proof evidence with full quality diagnostics.
- Add bounded receipt-gap telemetry and v2-native remediation guidance.
- Document and test the new receipt and proof-aware diagnostic requirements.
- Refresh the mirrored usage skills and dogfood-derived SkillOpt expectations.
- Keep the MCP package contract verifier self-contained with an explicit semver development dependency and matching workspace lock ranges.
