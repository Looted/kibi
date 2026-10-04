---
title: MCP surface serves the curated operation catalog over stdio JSON-RPC
status: active
id: SCEN-kibi-mcp-surface
type: scenario
links:
  - type: verified_by
    target: TEST-agent-kibi-interface-selection
  - type: verified_by
    target: TEST-mcp-upsert-coverage
  - type: verified_by
    target: TEST-mcp-skills-resource-discoverability
  - type: verified_by
    target: TEST-kibi-telemetry-acceptance-gate
  - type: verified_by
    target: TEST-e2e-mcp-model-requirement
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

GIVEN the packed kibi-mcp installation
WHEN a consumer drives the curated MCP tool catalog end to end (retrieval, discovery, mutation, validation, modeling, skills)
THEN every operation answers over the real stdio transport with the same semantics as the CLI peer, and no briefing surface is exposed.
