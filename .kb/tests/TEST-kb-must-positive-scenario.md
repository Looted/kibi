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
    receipt_id: PR-928356a3398754e1cc7cf9aa
    test_id: TEST-kb-must-positive-scenario
    scope: end_to_end
    outcome: passed
    code_snapshot: 681f2721e8c0d260a3c6623d1700de6cde06f7ec9049d294893f208c9205a59e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T21:35:24.477Z'
    finished_at: '2026-11-13T21:35:40.930Z'
    artifact_digest: e4f61d85ffa6c618b302d9d3230d549b9f1594be2eb9d42324d2469ec8632eac
    contract_hash: 1b9b8443c06a2c64f78b561d15ce91d66ebed32b4cbf328cf4dc54a2340efc7e
    binding_hash: 4cf1ed387f51b29eb91cc96aaefe2548bc1ac726ab64007524960f61bdc4155e
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
