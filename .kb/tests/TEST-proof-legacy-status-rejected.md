---
title: A requirement marked rejected shall be migrated as closed, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-legacy-status-rejected
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.rejected
  proves:
    - CLAIM-0A2412C4CAB9F99B
origin:
  kind: agent
  recorded_at: '2026-10-29T10:43:21.006Z'
id: TEST-proof-legacy-status-rejected
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b08539d3966f0dfe619e3389
    test_id: TEST-proof-legacy-status-rejected
    scope: unit
    outcome: passed
    code_snapshot: faf065f2781c1044c030ed22ef2de1f9fa5ba7e2c43b903b7407837a816cfb65
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:45:36.883Z'
    finished_at: '2026-10-29T10:45:37.138Z'
    artifact_digest: 5799b536d7a3591b9cb377f94582882a0b13b60d35f9be860d64a9195a32ade4
    contract_hash: ddfc1d9e51fb2747b88dabb04f7c80f0dc00796836c67ed4b1d7f9cd14b939d0
    binding_hash: 6a84d592fca3bc350ca3e029fc0184559f7d5102588b47a919c7ad1cb20e885d
    fingerprint: 6312224a9834500a7c4909f19e24083f5cc5a10e624b9657d0ade98f185bd493
    fingerprint_components:
      contract: ddfc1d9e51fb2747b88dabb04f7c80f0dc00796836c67ed4b1d7f9cd14b939d0
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-proof-legacy-status-rejected
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-legacy-status-rejected
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: closed
    certificate_digest: 497b3222a6426e69a049e069513cb205cfbc4312d81b7479ade6a86fd7ce5245
    claim_bindings:
      - claim_key: CLAIM-0A2412C4CAB9F99B
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-rejected
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: closed
---
Proves that a requirement marked rejected shall be migrated as closed, against the code Kibi reads at ingest.