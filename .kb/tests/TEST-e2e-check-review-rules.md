---
title: Packed kibi check review rules and native case ingest
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-check-review-rules
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T18:00:00.000Z'
id: TEST-e2e-check-review-rules
type: test
---
Runs the packed CLI on a fixture KB and checks when kibi check asks a person to review a requirement: the broad-requirement review with its umbrella exemption and closed dependents, the coarse-anchor review with its exemption for files no extractor covers, and the coverage-depth review skipping proof-exempt requirements. It also checks that proof ingest refuses a native case result with no native_id.

## Context

These review rules decided every split of Kibi's own requirements in the gold-standard review, so they are tested the way users install Kibi. Source: maintainer decision, 2026-11-11, approving the second review's wording batch.
