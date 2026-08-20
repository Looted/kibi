---
id: REQ-kibi-telemetry-acceptance-gate
title: Usage telemetry is a conservative workflow acceptance gate
status: open
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
priority: must
tags: [requirements, telemetry, acceptance, diagnostics, proof, workflow]
logic_claims:
  - CLAIM-2E5B714C69B22D1D
  - CLAIM-AB901A8086704B89
  - CLAIM-09AD7C82E721C27F
  - CLAIM-93F9FFAAA609B054
  - CLAIM-A632F920AC680BA9
  - CLAIM-81D951F7E8ADFDDB
  - CLAIM-46FCE7D8D88A8AC5
  - CLAIM-96B079D7FE47A40C
  - CLAIM-0AC18929C46FFB0D
  - CLAIM-A750757F5BC9A560
  - CLAIM-8BF5CD6FD8431A80
  - CLAIM-776EBD9C6088ED12
semantic_clauses:
  - Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report
  - The report must pass only when its evidence is no more than seven days old and every applicable metric passes
  - Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient
  - The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures
  - Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert
  - Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write
  - Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports
  - Three consecutive failed upserts for one mutation target must fail the retry-discipline metric
  - An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists
  - An absent opt-in usage log must not fabricate telemetry evidence
  - kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report
  - Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 36171aa6b33971476ad5c4858706c05610ff3202395e0c37b8460ff2e12d6258
semantic_inventory:
  - claim_key: CLAIM-2E5B714C69B22D1D
    claim_text: Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report
    role: normative
    status: modeled
    span: {start: 0, end: 97}
  - claim_key: CLAIM-AB901A8086704B89
    claim_text: The report must pass only when its evidence is no more than seven days old and every applicable metric passes
    role: normative
    status: modeled
    span: {start: 99, end: 208}
  - claim_key: CLAIM-09AD7C82E721C27F
    claim_text: Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient
    role: normative
    status: modeled
    span: {start: 210, end: 296}
  - claim_key: CLAIM-93F9FFAAA609B054
    claim_text: The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures
    role: normative
    status: modeled
    span: {start: 298, end: 532}
  - claim_key: CLAIM-A632F920AC680BA9
    claim_text: Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert
    role: normative
    status: modeled
    span: {start: 534, end: 656}
  - claim_key: CLAIM-81D951F7E8ADFDDB
    claim_text: Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write
    role: normative
    status: modeled
    span: {start: 658, end: 796}
  - claim_key: CLAIM-46FCE7D8D88A8AC5
    claim_text: Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports
    role: normative
    status: modeled
    span: {start: 798, end: 926}
  - claim_key: CLAIM-96B079D7FE47A40C
    claim_text: Three consecutive failed upserts for one mutation target must fail the retry-discipline metric
    role: normative
    status: modeled
    span: {start: 928, end: 1022}
  - claim_key: CLAIM-0AC18929C46FFB0D
    claim_text: An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists
    role: normative
    status: modeled
    span: {start: 1024, end: 1129}
  - claim_key: CLAIM-A750757F5BC9A560
    claim_text: An absent opt-in usage log must not fabricate telemetry evidence
    role: normative
    status: modeled
    span: {start: 1131, end: 1195}
  - claim_key: CLAIM-8BF5CD6FD8431A80
    claim_text: kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report
    role: exception
    status: modeled
    span: {start: 1197, end: 1322}
  - claim_key: CLAIM-776EBD9C6088ED12
    claim_text: Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit
    role: normative
    status: modeled
    span: {start: 1324, end: 1502}
links:
  - type: depends_on
    target: REQ-kibi-conservative-requirement-proof
  - type: depends_on
    target: REQ-kibi-dependency-ordered-repair-plan
  - type: specified_by
    target: SCEN-kibi-telemetry-acceptance-gate
  - type: requires_predicate
    target: FACT-PRED-E8FA9DDC5BEA
  - type: requires_predicate
    target: FACT-PRED-56D7C9AC1D9E
  - type: requires_predicate
    target: FACT-PRED-A4FBBF88EA6B
  - type: requires_predicate
    target: FACT-PRED-21C26F8E64F4
  - type: requires_predicate
    target: FACT-PRED-A29952A9FDA9
  - type: requires_predicate
    target: FACT-PRED-9577B3E62F04
  - type: requires_predicate
    target: FACT-PRED-4CCA58034E58
  - type: requires_predicate
    target: FACT-PRED-013AE2CA693B
  - type: requires_predicate
    target: FACT-PRED-2F0C934215A2
  - type: requires_predicate
    target: FACT-PRED-2FD5F64B095E
  - type: requires_predicate
    target: FACT-PRED-AD0C672ED7B9
  - type: requires_predicate
    target: FACT-PRED-4307CB603922
---

Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report. The report must pass only when its evidence is no more than seven days old and every applicable metric passes. Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient. The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures. Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert. Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write. Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports. Three consecutive failed upserts for one mutation target must fail the retry-discipline metric. An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists. An absent opt-in usage log must not fabricate telemetry evidence. kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report. Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit.
