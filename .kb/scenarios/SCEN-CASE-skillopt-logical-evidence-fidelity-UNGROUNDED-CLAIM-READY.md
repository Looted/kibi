---
title: A requirement with one ungrounded normative claim keeps advisor readiness partial
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:16:06.822Z'
id: SCEN-CASE-skillopt-logical-evidence-fidelity-UNGROUNDED-CLAIM-READY
type: scenario
---
Given a requirement with two normative claims and one requires_property grounding edge, for the first claim only, when kb_upsert previews it, then the semantic advisor's readiness is not ready and its logic coverage stays partial with the ungrounded claim unresolved; declaring that claim modeled anyway is refused because two modeled entries must equal the one grounding relationship.

The test case "keeps advisor readiness partial while a normative claim has no grounding edge" in documentation/tests/e2e/packed/ontology-convergence-witnesses.test.ts exercises it through the packed CLI. It covers the value past the bound, `gt 0`, of ungrounded normative claims while the advisor is ready.