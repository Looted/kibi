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
    receipt_id: PR-57971b5569d74a389267b85e
    test_id: TEST-kb-must-positive-scenario
    scope: end_to_end
    outcome: passed
    code_snapshot: f20a431f631679c22cb8c25b525427707fa11f2d65f3598953ab41152349ed36
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T03:44:32.371Z'
    finished_at: '2026-11-13T03:44:39.868Z'
    artifact_digest: 3520adb6b9694274808c10553f6350bea477d9da444984d0b11c1c5e7892bb61
    contract_hash: 1b9b8443c06a2c64f78b561d15ce91d66ebed32b4cbf328cf4dc54a2340efc7e
    binding_hash: f963ca08a22dd2c01b51f99e7e1442787972fc560d16e91400763e963823bec7
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
