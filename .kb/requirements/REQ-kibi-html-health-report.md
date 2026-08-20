---
title: CLI publishes a visual requirement health report
status: open
priority: must
tags:
  - cli
  - report
  - html
  - coverage
  - proof
  - ci
semantic_text: The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data. The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages. The report must escape knowledge-base text and work without network assets. The output option must accept an HTML file or directory and default to kibi-report/index.html. The open option must launch the generated file in the default browser only after a successful write. Report generation must fail when pagination would make requirement-level health metrics incomplete.
semantic_clauses:
  - The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data
  - The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages
  - The report must escape knowledge-base text and work without network assets
  - The output option must accept an HTML file or directory and default to kibi-report/index.html
  - The open option must launch the generated file in the default browser only after a successful write
  - Report generation must fail when pagination would make requirement-level health metrics incomplete
logic_claims:
  - CLAIM-C6E61A5288CDB088
  - CLAIM-4585ACCC37C749B8
  - CLAIM-59CFEDCE5CE79A3C
  - CLAIM-0611D9341478B890
  - CLAIM-31FEA3FB7DDEB58C
  - CLAIM-8F61569C04F4BEF8
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c0ba0c2036f65f89a176796ae9c28e26f2e9db47ab73028e3c1b4afeeaeacca4
semantic_inventory:
  - claim_key: CLAIM-C6E61A5288CDB088
    claim_text: The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
  - claim_key: CLAIM-4585ACCC37C749B8
    claim_text: The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages
    role: normative
    status: modeled
    span:
      start: 127
      end: 355
  - claim_key: CLAIM-59CFEDCE5CE79A3C
    claim_text: The report must escape knowledge-base text and work without network assets
    role: normative
    status: modeled
    span:
      start: 357
      end: 431
  - claim_key: CLAIM-0611D9341478B890
    claim_text: The output option must accept an HTML file or directory and default to kibi-report/index.html
    role: normative
    status: modeled
    span:
      start: 433
      end: 526
  - claim_key: CLAIM-31FEA3FB7DDEB58C
    claim_text: The open option must launch the generated file in the default browser only after a successful write
    role: normative
    status: modeled
    span:
      start: 528
      end: 627
  - claim_key: CLAIM-8F61569C04F4BEF8
    claim_text: Report generation must fail when pagination would make requirement-level health metrics incomplete
    role: normative
    status: modeled
    span:
      start: 629
      end: 727
id: REQ-kibi-html-health-report
type: req
---
The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data. The report must show the Git branch, current requirement count, fully proven count and percentage, missing scenarios, stale end-to-end evidence, unique contradictions, unowned production symbols, and per-requirement proof stages. The report must escape knowledge-base text and work without network assets. The output option must accept an HTML file or directory and default to kibi-report/index.html. The open option must launch the generated file in the default browser only after a successful write. Report generation must fail when pagination would make requirement-level health metrics incomplete.
