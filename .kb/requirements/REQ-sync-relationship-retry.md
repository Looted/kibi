---
title: Sync retries a relationship it could not assert once its target is fixed
status: open
priority: must
firmness: firm
tags:
  - cli
  - sync
semantic_text: kibi sync must retry a front-matter relationship it could not assert on the next sync, even when only the relationship's target changed. kibi sync must report no changes on the run after a retried relationship is asserted when no source changed.
semantic_clauses:
  - kibi sync must retry a front-matter relationship it could not assert on the next sync, even when only the relationship's target changed.
  - kibi sync must report no changes on the run after a retried relationship is asserted when no source changed.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the fixes from the requirements-to-code audit, including retrying relationships sync could not assert: "Yes, do both suggested." Claim wording settled in the same change.'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:17:43.029Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 709691498c6a8a955272552865af8e06b482fa48577271948da666b974184532
semantic_inventory:
  - claim_key: CLAIM-F2371320C4D36896
    claim_text: kibi sync must retry a front-matter relationship it could not assert on the next sync, even when only the relationship's target changed
    role: normative
    status: modeled
    span:
      start: 0
      end: 135
  - claim_key: CLAIM-65EA216B5E3DE047
    claim_text: kibi sync must report no changes on the run after a retried relationship is asserted when no source changed
    role: normative
    status: modeled
    span:
      start: 137
      end: 244
logic_claims:
  - CLAIM-F2371320C4D36896
  - CLAIM-65EA216B5E3DE047
id: REQ-sync-relationship-retry
type: req
---
kibi sync must retry a front-matter relationship it could not assert on the next sync, even when only the relationship's target changed. kibi sync must report no changes on the run after a retried relationship is asserted when no source changed.

## Context

Sync records each source file's hash in its sync cache and, on an incremental run, extracts only the files whose hash changed. A relationship declared in a requirement's front matter whose target failed to compile (for example a fact missing `claim_text`) was reported as failed, but its source file was cached anyway. Fixing only the target then left the link missing: sync reported "no changes" and `kibi check` kept reporting `source-relationship-parity` until `kibi sync --rebuild`. Sync now leaves such a source out of the cache, so the next run extracts it again.

## Source

Maintainer decision, 2026-11-03, approving the fixes from the requirements-to-code audit, including retrying relationships sync could not assert: "Yes, do both suggested."
