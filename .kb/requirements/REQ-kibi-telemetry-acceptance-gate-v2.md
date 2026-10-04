---
title: Usage telemetry is a conservative workflow acceptance gate that includes lookup before first edit
status: open
priority: must
tags:
  - requirements
  - telemetry
  - acceptance
  - diagnostics
  - proof
  - workflow
  - hooks
semantic_text: Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report. The report must pass only when its evidence is no more than seven days old and every applicable metric passes. Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient. The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures. Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert. Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write. Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports. Three consecutive failed upserts for one mutation target must fail the retry-discipline metric. An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists. An absent opt-in usage log must not fabricate telemetry evidence. kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report. Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit. The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file. The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file.
semantic_clauses:
  - Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report.
  - The report must pass only when its evidence is no more than seven days old and every applicable metric passes.
  - Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient.
  - The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures.
  - Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert.
  - Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write.
  - Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports.
  - Three consecutive failed upserts for one mutation target must fail the retry-discipline metric.
  - An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists.
  - An absent opt-in usage log must not fabricate telemetry evidence.
  - kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report.
  - Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit.
  - The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file.
  - The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ab0ec904c32fadc5aef2981cf0d8c2f7af927079efb2efab9cfb0034b02c75e3
semantic_inventory:
  - claim_key: CLAIM-2E5B714C69B22D1D
    claim_text: Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report
    role: normative
    span:
      start: 0
      end: 97
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-AB901A8086704B89
    claim_text: The report must pass only when its evidence is no more than seven days old and every applicable metric passes
    role: normative
    span:
      start: 99
      end: 208
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-09AD7C82E721C27F
    claim_text: Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient
    role: normative
    span:
      start: 210
      end: 296
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-531270A744471224
    claim_text: The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures
    role: normative
    span:
      start: 298
      end: 589
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A632F920AC680BA9
    claim_text: Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert
    role: normative
    span:
      start: 591
      end: 713
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-81D951F7E8ADFDDB
    claim_text: Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write
    role: normative
    span:
      start: 715
      end: 853
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-46FCE7D8D88A8AC5
    claim_text: Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports
    role: normative
    span:
      start: 855
      end: 983
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-96B079D7FE47A40C
    claim_text: Three consecutive failed upserts for one mutation target must fail the retry-discipline metric
    role: normative
    span:
      start: 985
      end: 1079
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-0AC18929C46FFB0D
    claim_text: An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists
    role: normative
    span:
      start: 1081
      end: 1186
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-A750757F5BC9A560
    claim_text: An absent opt-in usage log must not fabricate telemetry evidence
    role: normative
    span:
      start: 1188
      end: 1252
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-8BF5CD6FD8431A80
    claim_text: kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report
    role: exception
    span:
      start: 1254
      end: 1379
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-776EBD9C6088ED12
    claim_text: Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit
    role: normative
    span:
      start: 1381
      end: 1559
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-DB97AA4726C06D6A
    claim_text: The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file
    role: normative
    span:
      start: 1561
      end: 1727
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-2826A6AB85ACB393
    claim_text: The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file
    role: normative
    span:
      start: 1729
      end: 1851
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-2E5B714C69B22D1D
  - CLAIM-AB901A8086704B89
  - CLAIM-09AD7C82E721C27F
  - CLAIM-531270A744471224
  - CLAIM-A632F920AC680BA9
  - CLAIM-81D951F7E8ADFDDB
  - CLAIM-46FCE7D8D88A8AC5
  - CLAIM-96B079D7FE47A40C
  - CLAIM-0AC18929C46FFB0D
  - CLAIM-A750757F5BC9A560
  - CLAIM-8BF5CD6FD8431A80
  - CLAIM-776EBD9C6088ED12
  - CLAIM-DB97AA4726C06D6A
  - CLAIM-2826A6AB85ACB393
origin:
  kind: agent
  recorded_at: '2026-10-04T02:14:53.581Z'
id: REQ-kibi-telemetry-acceptance-gate-v2
type: req
---
Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report. The report must pass only when its evidence is no more than seven days old and every applicable metric passes. Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient. The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures. Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert. Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write. Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports. Three consecutive failed upserts for one mutation target must fail the retry-discipline metric. An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists. An absent opt-in usage log must not fabricate telemetry evidence. kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report. Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit. The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file. The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file.

## Rationale

The acceptance report gained an eighth metric, `lookup_before_first_edit`, so the telemetry acceptance and remediation reports show whether agents look requirements up before they change requirement-linked code (changeset `lookup-before-first-edit`). The metric reads the opt-in host hook rows and is not applicable when no hook recorded a requirement-linked edit, so logs without hook rows are judged as before. The superseded requirement listed only seven metrics; its other clauses carry over unchanged.
