---
title: Bootstrap shared subject fact tests
status: passing
priority: must
tags:
  - bootstrap
  - modeling
  - naming
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-subject-fact-shared
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:28.648Z'
id: TEST-bootstrap-subject-fact-shared
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fd61f916213073769b1370eb
    test_id: TEST-bootstrap-subject-fact-shared
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: aa669fb1a2b3d3afaa79531bfef2aed4320d069f363420d9beed33e837208495
    binding_hash: 5287dfa66671ecc119d84ffd0a49958cc60616ad4dc770641b38b75b750986cc
    fingerprint: 4b7526fdf72c64b1696cb20084c3968a3c74007f5986006049decf582a813b6b
    fingerprint_components:
      contract: aa669fb1a2b3d3afaa79531bfef2aed4320d069f363420d9beed33e837208495
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
      - symbol_id: SYM-test-bootstrap-subject-fact-shared
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/consumer/bootstrap-write-failures.test.ts` through the real CLI and Prolog engine: two declared sources with claims about the same subject plan one subject fact with two `constrains` links and a `subject-key-shared:` diagnostic, replan to the same hash, apply, and pass `kb_check` without `subject-key-identity`; the other bootstrap write cases in the file keep passing with the shared fact.