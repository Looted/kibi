---
title: Closed requirements in kibi search tests
status: active
priority: must
tags:
  - search
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-search-closed-requirements
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:32.449Z'
id: TEST-search-closed-requirements
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-348efb6b31a319f440e05e70
    test_id: TEST-search-closed-requirements
    scope: end_to_end
    outcome: passed
    code_snapshot: bfbe80a8260dce179ab736243ca6c2e5bab276b261aebcef5edd9651a9e65eac
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T04:05:39.662Z'
    finished_at: '2026-11-12T04:05:43.665Z'
    artifact_digest: 0e5c44d7ba086d80747368a9ab2c67ce8a95d937de5749480b78cac94394d3c0
    contract_hash: 040ae43f7b0e4cf07cdadef5bbf19c6837d0739c32defa6c00cea6f564e57e13
    binding_hash: 360b2c3ce2e25d03e11109b3f01365086a50dbd5f49467a622a301ea4b127d47
    fingerprint: 403d5b9de030cae837f455d3f2af06a7b4226c0de2883a9ee7ff5b1c18543c33
    fingerprint_components:
      contract: 040ae43f7b0e4cf07cdadef5bbf19c6837d0739c32defa6c00cea6f564e57e13
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
      - symbol_id: SYM-test-search-closed-requirements
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs packages/cli/tests/consumer/search-closed-requirements.test.ts through the built CLI: a closed requirement ranks with the reason demoted: closed at three quarters of the score of a current requirement that matches as well and follows it in the answer's governing list; a superseded requirement that matches weakly is listed under notGoverning without pulling its replacement into governing, and one that matches strongly leads to its replacement. It also runs the intent-search and search-answer unit suites, which pin the closed factor, the single demotion of a closed superseded requirement and the 0.8 replacement boundary.