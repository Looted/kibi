---
title: Observable capability plugin behavior
status: open
tags:
  - plugins
semantic_text: A workspace activates a capability plugin only through an explicit package.json kibi.plugins entry. Undeclared, path, and global plugin packages are rejected. An installed plugin that is not activated is not imported. With no kibi.plugins configuration, builtin providers remain the only providers. Replace, augment, and shadow follow their documented effects, and shadow output cannot change canonical results. External semantic classifiers are not invoked from maintenance operations. Optional Jev is absent from the default CLI, MCP, and runtime dependency graphs. Jev provider failure falls back to builtin classification without exposing credentials. A third-party SDK-only plugin can participate through the host capability path.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 00641072f27ac3b23578095bbcd6d2d2fc3107023c1c37251657d53fb4be716c
semantic_inventory:
  - claim_key: CLAIM-3C095531EDF5AF79
    claim_text: A workspace activates a capability plugin only through an explicit package.json kibi.plugins entry
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: descriptive
    span:
      start: 0
      end: 98
    status: ontology_gap
  - claim_key: CLAIM-95156CE62506589E
    claim_text: Undeclared, path, and global plugin packages are rejected
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      start: 100
      end: 157
    status: ontology_gap
  - claim_key: CLAIM-1D3FA1E75363E8E3
    claim_text: An installed plugin that is not activated is not imported
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: descriptive
    span:
      start: 159
      end: 216
    status: ontology_gap
  - claim_key: CLAIM-3A9E13F544490700
    claim_text: With no kibi.plugins configuration, builtin providers remain the only providers
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: descriptive
    span:
      start: 218
      end: 297
    status: ontology_gap
  - claim_key: CLAIM-7B5F74AD904E4B54
    claim_text: Replace, augment, and shadow follow their documented effects, and shadow output cannot change canonical results
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      start: 299
      end: 410
    status: ontology_gap
  - claim_key: CLAIM-10F7821C012A2279
    claim_text: External semantic classifiers are not invoked from maintenance operations
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: descriptive
    span:
      start: 412
      end: 485
    status: ontology_gap
  - claim_key: CLAIM-C014146BBA6704C4
    claim_text: Optional Jev is absent from the default CLI, MCP, and runtime dependency graphs
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: descriptive
    span:
      start: 487
      end: 566
    status: ontology_gap
  - claim_key: CLAIM-8AF8D5388207BF69
    claim_text: Jev provider failure falls back to builtin classification without exposing credentials
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: descriptive
    span:
      start: 568
      end: 654
    status: ontology_gap
  - claim_key: CLAIM-45979739101E3963
    claim_text: A third-party SDK-only plugin can participate through the host capability path
    payload_hash: 020eaa39d2a10ca4ceb180df9b9bb8ab5a3a14908d46990bde1e218fc74a0181
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      start: 656
      end: 734
    status: ontology_gap
logic_claims:
  - CLAIM-3C095531EDF5AF79
  - CLAIM-95156CE62506589E
  - CLAIM-1D3FA1E75363E8E3
  - CLAIM-3A9E13F544490700
  - CLAIM-7B5F74AD904E4B54
  - CLAIM-10F7821C012A2279
  - CLAIM-C014146BBA6704C4
  - CLAIM-8AF8D5388207BF69
  - CLAIM-45979739101E3963
id: REQ-capability-plugin-observable-behavior-v1
type: req
proof_exempt: true
proof_exempt_reason: Executable activation, rejection, mode, fallback, maintenance-path, and doctor behavior is executed by SCEN-capability-plugin-observable-behavior-v1 and TEST-e2e-capability-plugins with fresh command evidence. Strict proof still reports unresolved_semantic_proposition because each clause is an ontology gap and has no predicate schema. The requirement stays exempt so those gaps are not counted as proof and no placeholder facts are invented.
---
# REQ-capability-plugin-observable-behavior-v1

A workspace activates a capability plugin only through an explicit package.json kibi.plugins entry. Undeclared, path, and global plugin packages are rejected. An installed plugin that is not activated is not imported. With no kibi.plugins configuration, builtin providers remain the only providers. Replace, augment, and shadow follow their documented effects, and shadow output cannot change canonical results. External semantic classifiers are not invoked from maintenance operations. Optional Jev is absent from the default CLI, MCP, and runtime dependency graphs. Jev provider failure falls back to builtin classification without exposing credentials. A third-party SDK-only plugin can participate through the host capability path.
