---
title: CLI kibi doctor names only the missing merge driver setup steps
status: passing
priority: must
tags:
  - cli
  - doctor
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-05T11:48:06.065Z'
id: TEST-cli-doctor-merge-driver-remediation
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-cli-doctor-merge-driver-remediation-verifier
      target: default
  success_policy: all_required_first_attempt
---
Runs `kibi doctor` in a temporary Git workspace with symbol records and a pnpm lockfile: without `merge=kibi` lines the remediation names the lines and the driver command; once `.gitattributes` routes the manifests it names only `git config merge.kibi.driver "pnpm exec kibi merge-driver %O %A %B"`; once the driver is set the check reports Configured. Unit tests pin the remediation text for each combination of gaps.