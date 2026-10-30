---
title: A supersedes link without a reason shall be reported as supersedes-reason-missing, by a regex proof
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
    - symbol_id: SYM-proof-rule-supersedes-reason-missing
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-decision-firmness-supersedes-reason-missing-rule
  proves:
    - CLAIM-9256D7CE78D33CD5
origin:
  kind: agent
  recorded_at: '2026-10-29T16:40:23.761Z'
id: TEST-proof-rule-supersedes-reason-missing
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2f1862140ecd25e834955649
    test_id: TEST-proof-rule-supersedes-reason-missing
    scope: unit
    outcome: passed
    code_snapshot: a29ab0b7ed18b6a171a62094b8cf21f0c4a2013eca287583b5dc35ba5bd319c0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:32:56.621Z'
    finished_at: '2026-10-29T17:32:56.808Z'
    artifact_digest: 418f3105a8408512dacca277ed9260768de183d6f0b8f994773b29a3ee730ce3
    contract_hash: 863def716f120d75c0b502cb8d974d5bbc60c9e189af88d7bb46172da8b335c4
    binding_hash: 515e3035e1bbf8a07ad23f69148f666abe3c508a173e94c75734d98e28b98bcc
    fingerprint: 1e3eb99fdb46634177faa6130bbf0c600169fa39aec30d63658748334ce57057
    fingerprint_components:
      contract: 863def716f120d75c0b502cb8d974d5bbc60c9e189af88d7bb46172da8b335c4
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
      - symbol_id: SYM-proof-rule-supersedes-reason-missing
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
      test_id: TEST-proof-rule-supersedes-reason-missing
      pattern:
        symbol_id: SYM-decision-firmness-supersedes-reason-missing-rule
        type: string
        value: supersedes-reason-missing
    certificate_digest: 725f0d8861ae70c9f3f1b92322a4988636de5bd4c0a320563725878abe169243
    claim_bindings:
      - claim_key: CLAIM-9256D7CE78D33CD5
        requirement_id: REQ-kb-decision-firmness-rule-names
        fact_id: FACT-rule-supersedes-reason-missing
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: supersedes-reason-missing
---
Proves that a supersedes link without a reason shall be reported as supersedes-reason-missing, against the code Kibi reads at ingest.