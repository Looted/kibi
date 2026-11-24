---
title: Pull-request release dry runs reuse keyed SWI-Prolog archives and publish builds from source
status: open
tags:
  - prolog
  - release
  - cache
  - lane:strict
text_ref: .github/workflows/release-pack.yml
semantic_text: A pull-request run of the release dry-run must restore a per-target SWI-Prolog archive when its cache key matches and must build that target from source when the key misses. The cache key must be the target plus a hash of the version pins, build scripts, source patches and the build workflow, and it must have no fallback key. Publish, a dry-run push and a manual dry-run must build every archive from source in that run and must not restore a cached archive. A pull-request dry run must drop the commit and run binding only when the restored archive's cache status says hit. Publish must never drop that binding.
logic_claims:
  - CLAIM-9CCDD88768EF27C4
  - CLAIM-8BC0884795FDBEF7
  - CLAIM-7EE07E05E0A42486
  - CLAIM-7813F93A42785030
  - CLAIM-B225BEB2EBC146E3
semantic_clauses:
  - A pull-request run of the release dry-run must restore a per-target SWI-Prolog archive when its cache key matches and must build that target from source when the key misses
  - The cache key must be the target plus a hash of the version pins, build scripts, source patches and the build workflow, and it must have no fallback key
  - Publish, a dry-run push and a manual dry-run must build every archive from source in that run and must not restore a cached archive
  - A pull-request dry run must drop the commit and run binding only when the restored archive's cache status says hit
  - Publish must never drop that binding
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bdd35f81a1e74016eb3c4166a1d56e74146a9ead619a138efc2154638549ec83
semantic_inventory:
  - claim_key: CLAIM-9CCDD88768EF27C4
    claim_text: A pull-request run of the release dry-run must restore a per-target SWI-Prolog archive when its cache key matches and must build that target from source when the key misses
    role: normative
    status: modeled
    span:
      start: 0
      end: 172
    payload_hash: feb44dfab03f9b0a703ec10f420249c4c50fa5f20911bff81abcf38e28b35f3d
    reason: Grounded by FACT-prolog-release-pack-pr-cache-hit-or-source via requires_property.
  - claim_key: CLAIM-8BC0884795FDBEF7
    claim_text: The cache key must be the target plus a hash of the version pins, build scripts, source patches and the build workflow, and it must have no fallback key
    role: normative
    status: modeled
    span:
      start: 174
      end: 326
    payload_hash: feb44dfab03f9b0a703ec10f420249c4c50fa5f20911bff81abcf38e28b35f3d
    reason: Grounded by FACT-prolog-release-pack-cache-key-exact via requires_property.
  - claim_key: CLAIM-7EE07E05E0A42486
    claim_text: Publish, a dry-run push and a manual dry-run must build every archive from source in that run and must not restore a cached archive
    role: normative
    status: modeled
    span:
      start: 328
      end: 459
    payload_hash: feb44dfab03f9b0a703ec10f420249c4c50fa5f20911bff81abcf38e28b35f3d
    reason: Grounded by FACT-prolog-release-pack-non-pr-from-source via requires_property.
  - claim_key: CLAIM-7813F93A42785030
    claim_text: A pull-request dry run must drop the commit and run binding only when the restored archive's cache status says hit
    role: normative
    status: modeled
    span:
      start: 461
      end: 575
    payload_hash: feb44dfab03f9b0a703ec10f420249c4c50fa5f20911bff81abcf38e28b35f3d
    reason: Grounded by FACT-prolog-release-pack-binding-only-on-hit via requires_property.
  - claim_key: CLAIM-B225BEB2EBC146E3
    claim_text: Publish must never drop that binding
    role: normative
    status: modeled
    span:
      start: 577
      end: 613
    payload_hash: feb44dfab03f9b0a703ec10f420249c4c50fa5f20911bff81abcf38e28b35f3d
    reason: Grounded by FACT-prolog-release-pack-publish-keeps-binding via requires_property.
firmness: firm
required_evidence: asserted
rationale: Pull-request runs of release-pack were rebuilding SWI-Prolog from source for five platforms, about fifteen minutes each. The user asked for those runs to reuse cached archives, invalidated by a version or config change, while publish and other release runs keep building from source so a released package never ships a cached build.
origin:
  kind: human
  ref: 'User request 2026-11-24: PR runs reuse cached SWI-Prolog build artifacts, with the cache keyed so a version or config change invalidates it. Real publish and release runs keep building from source, so released packages never ship a cached build.'
  recorded_at: '2026-11-24T15:07:24.346Z'
id: REQ-prolog-release-pack-pr-archive-cache
type: req
---
A pull-request run of the release dry-run must restore a per-target SWI-Prolog archive when its cache key matches and must build that target from source when the key misses. The cache key must be the target plus a hash of the version pins, build scripts, source patches and the build workflow, and it must have no fallback key. Publish, a dry-run push and a manual dry-run must build every archive from source in that run and must not restore a cached archive. A pull-request dry run must drop the commit and run binding only when the restored archive's cache status says hit. Publish must never drop that binding.

## Context
The user asked for pull-request runs of the release-pack workflow to reuse cached SWI-Prolog build artifacts, with the cache keyed so a version or config change invalidates it, while real publish and release runs keep building from source so a released package never ships a cached build. This does not use the CI bundle cache or the --cached-build flag. Publish omits the cache input, so the build workflow stays in its default off mode.

## Source
> PR runs reuse cached SWI-Prolog build artifacts, with the cache keyed so a version or config change invalidates it. Real publish and release runs keep building from source, so released packages never ship a cached build.

User request, 2026-11-24.
