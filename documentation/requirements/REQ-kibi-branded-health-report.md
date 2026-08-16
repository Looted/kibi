---
title: Requirement health uses Kibi's proof-rail identity
status: open
priority: must
tags:
  - cli
  - report
  - badge
  - brand
  - proof
  - accessibility
semantic_text: The Kibi HTML requirement-health report and generated badge must use the canonical Kibi logo, wordmark, and proof-rail visual system. The report must show the exact proven numerator and current-requirement denominator beside the percentage. The report must show sequential semantic-model, scenario, implementation, end-to-end, and evidence gate counts. Each requirement drop must be assigned to the earliest unmet gate. The report and badge must remain self-contained and use no network assets. The report must meet WCAG AA contrast and communicate status without color alone. The report must remain responsive and printable.
semantic_clauses:
  - The Kibi HTML requirement-health report and generated badge must use the canonical Kibi logo, wordmark, and proof-rail visual system
  - The report must show the exact proven numerator and current-requirement denominator beside the percentage
  - The report must show sequential semantic-model, scenario, implementation, end-to-end, and evidence gate counts
  - Each requirement drop must be assigned to the earliest unmet gate
  - The report and badge must remain self-contained and use no network assets
  - The report must meet WCAG AA contrast and communicate status without color alone
  - The report must remain responsive and printable
logic_claims:
  - CLAIM-9CB7F74E46AEF113
  - CLAIM-E1F0DBED556875B9
  - CLAIM-6423E18D5AE8D465
  - CLAIM-31ECAC1C557944EC
  - CLAIM-508540B126EC9849
  - CLAIM-E369BAFB4AA913A6
  - CLAIM-45F10B77B0974B6E
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ab66ec5c57278aac063f3b18aba37bdede0879ce7ff4f0d320501f038bfdc9b4
semantic_inventory:
  - claim_key: CLAIM-9CB7F74E46AEF113
    claim_text: The Kibi HTML requirement-health report and generated badge must use the canonical Kibi logo, wordmark, and proof-rail visual system
    role: normative
    status: modeled
    span:
      start: 0
      end: 132
  - claim_key: CLAIM-E1F0DBED556875B9
    claim_text: The report must show the exact proven numerator and current-requirement denominator beside the percentage
    role: normative
    status: modeled
    span:
      start: 134
      end: 239
  - claim_key: CLAIM-6423E18D5AE8D465
    claim_text: The report must show sequential semantic-model, scenario, implementation, end-to-end, and evidence gate counts
    role: normative
    status: modeled
    span:
      start: 241
      end: 351
  - claim_key: CLAIM-31ECAC1C557944EC
    claim_text: Each requirement drop must be assigned to the earliest unmet gate
    role: normative
    status: modeled
    span:
      start: 353
      end: 418
  - claim_key: CLAIM-508540B126EC9849
    claim_text: The report and badge must remain self-contained and use no network assets
    role: normative
    status: modeled
    span:
      start: 420
      end: 493
  - claim_key: CLAIM-E369BAFB4AA913A6
    claim_text: The report must meet WCAG AA contrast and communicate status without color alone
    role: normative
    status: modeled
    span:
      start: 495
      end: 575
  - claim_key: CLAIM-45F10B77B0974B6E
    claim_text: The report must remain responsive and printable
    role: normative
    status: modeled
    span:
      start: 577
      end: 624
links:
  - type: depends_on
    target: REQ-kibi-html-health-report
  - type: specified_by
    target: SCEN-kibi-branded-health-report
  - type: requires_predicate
    target: FACT-PRED-B5E4CFDC9A04
  - type: requires_predicate
    target: FACT-PRED-F77549FC997F
  - type: requires_predicate
    target: FACT-PRED-BFDEDAFC1AD7
  - type: requires_predicate
    target: FACT-PRED-8F2A30505648
  - type: requires_predicate
    target: FACT-PRED-6D2DA8F7F701
  - type: requires_predicate
    target: FACT-PRED-A9C0A4D7EC2B
  - type: requires_predicate
    target: FACT-PRED-EC5B82EBAD0A
id: REQ-kibi-branded-health-report
type: req
---
Kibi's public requirement-health report is a proof instrument and a brand surface. It uses the canonical marks and proof-rail visual grammar while keeping strict health data understandable, portable, and accessible.
