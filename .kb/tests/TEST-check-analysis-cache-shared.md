---
title: Shared source analysis cache tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - symbols
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-analysis-cache-shared
      target: default
  success_policy: all_required_first_attempt
id: TEST-check-analysis-cache-shared
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-79cad08bf43ea323443bde2f
    test_id: TEST-check-analysis-cache-shared
    scope: end_to_end
    outcome: passed
    code_snapshot: 0156dc6166b4ef4fd3c6c0c2d75ab10d5a7261655be1598bc70e7fbc2455fdc2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T06:05:56.275Z'
    finished_at: '2026-11-17T06:05:56.595Z'
    artifact_digest: 858f639a905236418d0e60d047452bd6eab2e079d353cad82a4932bd84e584d5
    contract_hash: 22920468e46fa833585484a3789c39060ac67eacf5b86f03ee6e6e170ee46c0b
    binding_hash: 09a982cc4805df93e05780795fda49a7905bac08e0122ba11a81958e512080e2
    fingerprint: e90efd3cd2649f3db78709e2b8b14a2b7d792a7ca22c53bcfea0abc72936f9bb
    fingerprint_components:
      contract: 22920468e46fa833585484a3789c39060ac67eacf5b86f03ee6e6e170ee46c0b
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
      - symbol_id: SYM-test-check-analysis-cache-shared
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that kibi check opens the branch analysis cache once, hands it to the granularity and symbol debt steps and saves it once after both, and that a step called with an open cache neither opens nor saves another.