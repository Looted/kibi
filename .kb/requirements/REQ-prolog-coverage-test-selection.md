---
title: Prolog coverage includes every selected test file
status: open
priority: must
text_ref: scripts/run-prolog-coverage.pl
tags:
  - prolog
  - coverage
  - testing
semantic_text: The Prolog coverage runner must load every test file supplied by repeated --test options. The Prolog coverage runner must fail when any selected test file contains a failing test. The Prolog coverage runner must include each selected test file in annotated coverage artifacts.
semantic_clauses:
  - The Prolog coverage runner must load every test file supplied by repeated --test options
  - The Prolog coverage runner must fail when any selected test file contains a failing test
  - The Prolog coverage runner must include each selected test file in annotated coverage artifacts
logic_claims:
  - CLAIM-2FCB4EC98FDD503E
  - CLAIM-650C8C759989C453
  - CLAIM-4F7C962FC04DA2DA
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d1614a0218d1062f4e746d953cb0ddedbfaf8801b95da28e5d608896307d737c
semantic_inventory:
  - claim_key: CLAIM-2FCB4EC98FDD503E
    claim_text: The Prolog coverage runner must load every test file supplied by repeated --test options
    role: normative
    status: modeled
    span:
      start: 0
      end: 88
  - claim_key: CLAIM-650C8C759989C453
    claim_text: The Prolog coverage runner must fail when any selected test file contains a failing test
    role: normative
    status: modeled
    span:
      start: 90
      end: 178
  - claim_key: CLAIM-4F7C962FC04DA2DA
    claim_text: The Prolog coverage runner must include each selected test file in annotated coverage artifacts
    role: normative
    status: modeled
    span:
      start: 180
      end: 275
id: REQ-prolog-coverage-test-selection
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The Prolog coverage runner must load every test file supplied by repeated --test options. The Prolog coverage runner must fail when any selected test file contains a failing test. The Prolog coverage runner must include each selected test file in annotated coverage artifacts.
