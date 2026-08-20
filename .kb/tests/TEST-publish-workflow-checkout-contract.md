---
id: TEST-publish-workflow-checkout-contract
title: Publish workflow checkout contract stays shallow and artifact-aware
status: passing
created_at: 2026-04-21T17:11:22Z
updated_at: 2026-04-21T17:11:22Z
source: documentation/tests/TEST-publish-workflow-checkout-contract.md
tags:
  - release
  - automation
  - workflow
  - ci
links:
  - REQ-020
  - ADR-014
  - FACT-009
---

# Publish Workflow Checkout Contract

Automated verification lives in `scripts/tests/release-workflow-contract.test.ts`.

## Governed Jobs

The contract covers all five jobs in `.github/workflows/publish.yml`:

| Job | Checkout | Depth | Rationale |
|-----|----------|-------|-----------|
| **check-release** | `actions/checkout@v6` | `fetch-depth: 1` | Needs repo files for release state script; full history unnecessary |
| **build-and-check** | `actions/checkout@v6` | `fetch-depth: 1` | Builds from source; pinned to `refs/heads/master` |
| **release-gate** | `actions/checkout@v6` | `fetch-depth: 1` | Runs opencode packed tests that read repo-root source paths; pinned to `refs/heads/master` |
| **publish** | **None** | N/A | Artifact-only after tarball download; `npm publish --provenance` uses GitHub Actions OIDC/env metadata, not a git working tree |
| **create-github-releases** | `actions/checkout@v6` | `fetch-depth: 1` | Reads checked-out `package.json` and `CHANGELOG.md`; pinned to `refs/heads/master` |

## Key Properties

- **`publish` is checkout-free**: it downloads pre-built tarballs from the `build-and-check` job artifact and publishes them directly. No git working tree is required.
- **All other jobs are shallow** (`fetch-depth: 1`): they check out only the single commit needed, avoiding the bandwidth and time cost of a full clone.
- **Source-backed jobs pin to `refs/heads/master`**: `build-and-check`, `release-gate`, and `create-github-releases` explicitly reference `refs/heads/master` to ensure deterministic checkout.
- **No job uses `fetch-depth: 0`**: the contract explicitly rejects full-history clones in every job block.
