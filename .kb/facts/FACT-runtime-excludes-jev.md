---
title: The kibi-runtime package dependencies shall exclude kibi-plugin-jev
status: active
fact_kind: property_value
subject_key: kibi.packages.kibi_runtime
claim_key: CLAIM-3A89EF7214DE03AB
claim_text: The kibi-runtime package dependencies shall exclude kibi-plugin-jev
text_ref: REQ-capability-plugin-jev-optional-dependency
property_key: dependencies
operator: excludes
value_type: set
value_set:
  - kibi-plugin-jev
origin:
  kind: agent
  recorded_at: '2026-10-28T10:17:35.364Z'
id: FACT-runtime-excludes-jev
type: fact
---
REQ-capability-plugin-observable-behavior-v1 says optional Jev must be absent from the default CLI, MCP and runtime dependency graphs. The first step of that graph is each package's own dependencies in its package.json; this requirement states that step for kibi-cli, kibi-mcp and kibi-runtime so it is proved against the manifests. Transitive absence stays tested there.