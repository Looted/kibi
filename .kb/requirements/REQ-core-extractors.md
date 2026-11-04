---
id: REQ-core-extractors
title: Markdown and YAML metadata extractors
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-08-02T00:00:00.000Z
source: REQ-007
priority: must
tags:
  - cli
  - extractors
  - sync
  - review:context-missing
links:
  - type: supersedes
    target: REQ-007
  - type: specified_by
    target: SCEN-001
semantic_text: The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges. The symbol extractor must import code symbol definitions from symbols.yaml into the KB. Typed relationship objects in Markdown front matter must be imported with their explicit types. Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml. Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.
logic_claims:
  - CLAIM-B6CFD3F2FE7ACA69
  - CLAIM-2B61831A52C4F752
  - CLAIM-032A21035746B5BE
  - CLAIM-4CC3B142BC51AEA3
  - CLAIM-973E5C6674238256
semantic_clauses:
  - The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges.
  - The symbol extractor must import code symbol definitions from symbols.yaml into the KB.
  - Typed relationship objects in Markdown front matter must be imported with their explicit types.
  - Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml.
  - Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d34e7697c66eb88576e1abee9036dafe71e48555762f1b6f1995f2f8d1080908
semantic_inventory:
  - claim_key: CLAIM-B6CFD3F2FE7ACA69
    claim_text: The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges
    role: normative
    status: modeled
    span:
      start: 0
      end: 123
  - claim_key: CLAIM-2B61831A52C4F752
    claim_text: The symbol extractor must import code symbol definitions from symbols.yaml into the KB
    role: normative
    status: modeled
    span:
      start: 125
      end: 211
  - claim_key: CLAIM-032A21035746B5BE
    claim_text: Typed relationship objects in Markdown front matter must be imported with their explicit types
    role: normative
    status: modeled
    span:
      start: 213
      end: 307
  - claim_key: CLAIM-4CC3B142BC51AEA3
    claim_text: Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml
    role: normative
    status: modeled
    span:
      start: 309
      end: 431
  - claim_key: CLAIM-973E5C6674238256
    claim_text: Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest
    role: normative
    status: modeled
    span:
      start: 433
      end: 572
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:34:18.000Z'
failure_side_waiver: "The claims describe extraction and idempotent refresh. Malformed front matter is reported as a warning, which other requirements govern, so this one refuses nothing."
failure_side_waiver_approved_by: Piotr Franczyk
firmness: firm
required_evidence: tested
rationale: "Markdown and YAML are the authored source of truth for the KB, so extraction must import them faithfully, including typed links, or the graph diverges from what people wrote."
---
- The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges.
- The symbol extractor must import code symbol definitions from symbols.yaml into the KB.
- Typed relationship objects in Markdown front matter must be imported with their explicit types.
- Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml.
- Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.
