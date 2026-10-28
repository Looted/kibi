---
title: The granularity check shall cover implements, covered_by and executable_for links, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-granularity-link-types
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-TRACEABILITY_RELATIONSHIP_TYPES
  proves:
    - CLAIM-E0AFAE13BA353969
origin:
  kind: agent
  recorded_at: '2026-10-28T19:10:39.474Z'
id: TEST-proof-granularity-link-types
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bfd4e700898a189f769dcdb5
    test_id: TEST-proof-granularity-link-types
    scope: unit
    outcome: passed
    code_snapshot: f978b6e9b5fcce43bf3cbf2642f823bfa13a3389978b17ba625fe7b9e3299f1e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:12:34.464Z'
    finished_at: '2026-10-28T19:12:34.574Z'
    artifact_digest: 2854ae43a7c544cd773deee6f9199c60fe16fefdfded5c93653d096ce38d6d96
    contract_hash: 1de93171ca096eed54bda3af148dac6cb844e7e852a8c59af4c48511625285dd
    binding_hash: f8c427b2651a0f95b6c59f784bf708a66fe99fe371b043562f771ce69f767627
    fingerprint: 81c236e01124a5bb2fe0f504fb42bc7f3d35b959b480acaa5cc8e1e7ef62549c
    fingerprint_components:
      contract: 1de93171ca096eed54bda3af148dac6cb844e7e852a8c59af4c48511625285dd
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
      - symbol_id: SYM-proof-granularity-link-types
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-granularity-link-types
      domain:
        symbol_id: SYM-TRACEABILITY_RELATIONSHIP_TYPES
        members:
          - implements
          - covered_by
          - executable_for
      results:
        - member: implements
          outcome: passed
        - member: covered_by
          outcome: passed
        - member: executable_for
          outcome: passed
    certificate_digest: 668d29b989b9b95d527e3ed1594152656ea27a295be174926a7c6e402c35d615
    claim_bindings:
      - claim_key: CLAIM-E0AFAE13BA353969
        requirement_id: REQ-symbol-granularity-vocabulary
        fact_id: FACT-granularity-link-types
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - covered_by
            - executable_for
            - implements
---
Proves that the granularity check shall cover implements, covered_by and executable_for links, against the code Kibi reads at ingest.