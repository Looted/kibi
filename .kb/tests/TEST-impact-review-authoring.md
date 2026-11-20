---
title: kb_author_impact_review writes, refuses and carries impact-review decisions
status: passing
priority: must
tags:
  - impact-policy
  - public-preparation
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-impact-review-authoring
      target: default
  success_policy: all_required_first_attempt
id: TEST-impact-review-authoring
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b053c1c294613ef37b317671
    test_id: TEST-impact-review-authoring
    scope: end_to_end
    outcome: passed
    code_snapshot: adea33e26c88941393a8c6226718a912bd53302a69d8e139fe10242571d2fb07
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-19T20:12:15.648Z'
    finished_at: '2026-11-19T20:12:21.994Z'
    artifact_digest: acdd98bc06109f90b3494418198cb5e2e8dec927125c8a0edbefb9ecc1c202ce
    contract_hash: 7195e68aa4e6c549b45dcd5595cff5da30d0bf35eeed2b9c95e52e8394e5338b
    binding_hash: 5adf7bf71e878618557129aa86b339ab0b1d6f4c0d217754bf7b2f0a7cc5309e
    fingerprint: 8350ec88db957fe581fe84b56cfebd29acd753bcd8f3e1c6de5dfa16e4566a82
    fingerprint_components:
      contract: 7195e68aa4e6c549b45dcd5595cff5da30d0bf35eeed2b9c95e52e8394e5338b
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
      - symbol_id: SYM-test-impact-review-authoring
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kb_author_impact_review on real staged Git repositories (packages/cli/tests/traceability/impact-review-authoring.test.ts): a record written from decisions and the captured evidence that the strict parser accepts, unstaged, with the reviewer id and review time; a refusal for a scope fingerprint other than the captured one that writes nothing; refusals for a decision naming an unknown requirement, a decision without its rationale, an unknown path and a path decided twice that leave the existing record unchanged; a refusal for an undecided file that names an earlier decision dropped for it; an earlier decision kept for an unchanged file, dropped for a changed file or requirement, and reported for a file that left the scope; and carriedDecisions on absent, malformed and unbound earlier records.

A false pass would be a test that checks only the result's counts, so a record that is invalid, staged or overwritten on refusal still reads as written, or a carry test whose file never changes.