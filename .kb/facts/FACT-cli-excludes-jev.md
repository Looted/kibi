---
title: The kibi-cli package dependencies shall exclude kibi-plugin-jev
status: active
fact_kind: property_value
subject_key: kibi.packages.kibi_cli
claim_key: CLAIM-5D1C017C0416B115
claim_text: The kibi-cli package dependencies shall exclude kibi-plugin-jev
text_ref: REQ-capability-plugin-jev-optional-dependency
property_key: dependencies
operator: excludes
value_type: set
value_set:
  - kibi-plugin-jev
origin:
  kind: agent
  recorded_at: '2026-10-28T10:17:33.595Z'
id: FACT-cli-excludes-jev
type: fact
---
REQ-capability-plugin-observable-behavior-v1 says optional Jev must be absent from the default CLI, MCP and runtime dependency graphs. The first step of that graph is each package's own dependencies in its package.json; this requirement states that step for kibi-cli, kibi-mcp and kibi-runtime so it is proved against the manifests. Transitive absence stays tested there.