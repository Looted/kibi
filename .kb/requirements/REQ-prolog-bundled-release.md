---
title: Release packaging ships only verified, symlink-free bundled SWI-Prolog runtimes and a dry run that cannot publish
status: open
tags:
  - prolog
  - bundle
  - release
  - lane:strict
priority: must
text_ref: scripts/populate-swipl-platform-packages.mjs
semantic_text: Release packaging must populate each kibi-swipl platform package only from a SWI-Prolog archive whose SHA-256 sidecar, pinned provenance, and binary SHA-256 all verify. Release packaging must ship each platform package payload as regular files with no symbolic links. The release dry-run workflow must not be able to publish.
logic_claims:
  - CLAIM-239A01CC6F49DCFD
  - CLAIM-7D4BAD0538477DBF
  - CLAIM-394EBFBE57F6F403
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a9d816008b3d41ddf85f56d924b0f4c92afc997ac81918e582c97e94c54b571f
semantic_inventory:
  - claim_key: CLAIM-239A01CC6F49DCFD
    claim_text: Release packaging must populate each kibi-swipl platform package only from a SWI-Prolog archive whose SHA-256 sidecar, pinned provenance, and binary SHA-256 all verify
    role: normative
    status: modeled
    span:
      start: 0
      end: 167
    payload_hash: bfca5425411b56a2ba1c71526e5b78f9c9e9ac640cbc4a1e2bdda6f26f27c3d8
    reason: Grounded by FACT-prolog-bundled-release-populates-only-from-verified-archive via requires_property.
  - claim_key: CLAIM-7D4BAD0538477DBF
    claim_text: Release packaging must ship each platform package payload as regular files with no symbolic links
    role: normative
    status: modeled
    span:
      start: 169
      end: 266
    payload_hash: bfca5425411b56a2ba1c71526e5b78f9c9e9ac640cbc4a1e2bdda6f26f27c3d8
    reason: Grounded by FACT-prolog-bundled-release-ships-regular-files-only via requires_property.
  - claim_key: CLAIM-394EBFBE57F6F403
    claim_text: The release dry-run workflow must not be able to publish
    role: normative
    status: modeled
    span:
      start: 268
      end: 324
    payload_hash: bfca5425411b56a2ba1c71526e5b78f9c9e9ac640cbc4a1e2bdda6f26f27c3d8
    reason: Grounded by FACT-prolog-bundled-release-dry-run-can-publish via requires_property.
id: REQ-prolog-bundled-release
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Release packaging must populate each kibi-swipl platform package only from a SWI-Prolog archive whose SHA-256 sidecar, pinned provenance, and binary SHA-256 all verify. Release packaging must ship each platform package payload as regular files with no symbolic links. The release dry-run workflow must not be able to publish.
