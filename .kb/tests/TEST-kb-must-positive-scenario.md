---
title: Positive scenario rule and schema 17 acknowledgement tests
status: passing
priority: must
tags:
  - kb
  - domain-subjects
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-must-positive-scenario
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-13T04:00:00.000Z'
id: TEST-kb-must-positive-scenario
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d368f9214a73c50ca8423702
    test_id: TEST-kb-must-positive-scenario
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1b9b8443c06a2c64f78b561d15ce91d66ebed32b4cbf328cf4dc54a2340efc7e
    binding_hash: 4c301375d4ce3714443b26b1d177f15f7063911902dde625e33248f6d2528f6d
    fingerprint: b172c6a02e6d37a59fd9c5249b6efc706dbca717a25cbc0aeb2a84d56edb3a02
    fingerprint_components:
      contract: 1b9b8443c06a2c64f78b561d15ce91d66ebed32b4cbf328cf4dc54a2340efc7e
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
      - symbol_id: SYM-test-kb-must-positive-scenario
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real `kibi` CLI on a temporary Git workspace (packages/cli/tests/consumer/positive-scenarios.test.ts): a must requirement on the call quota written before a `kibi migrate --yes` from schema 16, which the manifest then records; a new unmodeled must requirement on the same subject, checked with `kibi check --rules must-positive-scenario` before it has a scenario, with a success scenario that assumes nothing, and with one that assumes the quota is used up; and `kibi check --rules scenario-feasibility`, which then refuses that scenario and names the quota requirement. Unit suites cover each finding, the schema and rule gates, the acknowledgement and the Prolog gap predicate.

A false pass would be a check that reports nothing because the rule never ran; the test therefore also expects the findings it should get (the new requirement without a scenario, then without an assumption on its subject) and the feasibility refusal.
