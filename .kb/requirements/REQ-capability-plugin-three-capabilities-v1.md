---
title: Three replaceable capabilities
status: open
tags:
  - plugins
semantic_text: Kibi capability plugins may provide only kibi.semantic-classifier.v1, kibi.ontology-pack.v1, and kibi.symbol-extractor.v1 under kibi.plugin.v1, with at most one replace provider per capability and shadow providers never affecting canonical results.
logic_claims:
  - CLAIM-156AE106CE4BD7B0
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3ebe36316657cff2fe81417ac58c245907739af662d5bc9789df2d8aaf9b49cd
semantic_inventory:
  - claim_key: CLAIM-156AE106CE4BD7B0
    claim_text: Kibi capability plugins may provide only kibi.semantic-classifier.v1, kibi.ontology-pack.v1, and kibi.symbol-extractor.v1 under kibi.plugin.v1, with at most one replace provider per capability and shadow providers never affecting canonical results
    payload_hash: 45c37a4d362205e10d7ebc20cac6754a07139e1f3610d701326acb350a892ffc
    reason: No accepted typed interpretation grounds this assertive proposition.
    role: descriptive
    span:
      end: 247
      start: 0
    status: missing
id: REQ-capability-plugin-three-capabilities-v1
type: req
proof_exempt: true
proof_exempt_reason: architectural boundary — verified by plugin SDK/host mode-resolution unit tests, not product E2E
---
# REQ-capability-plugin-three-capabilities-v1

Kibi capability plugins may provide only kibi.semantic-classifier.v1, kibi.ontology-pack.v1, and kibi.symbol-extractor.v1 under kibi.plugin.v1, with at most one replace provider per capability and shadow providers never affecting canonical results.
