---
title: Kibi compiles a never-compiled branch store on first use
status: open
semantic_text: Kibi must compile a never-compiled branch store on first use without writing any file Git tracks, unless auto-sync is turned off.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 71d220bade6b9c4caea538b2dc084c78c816e55557be0d73da528be5cd2e82ef
semantic_inventory:
  - claim_key: CLAIM-9257D259BEE7DE86
    claim_text: Kibi must compile a never-compiled branch store on first use without writing any file Git tracks, unless auto-sync is turned off
    role: exception
    status: modeled
    span:
      start: 0
      end: 128
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-9257D259BEE7DE86
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:16:28.551Z'
priority: must
firmness: firm
tags:
  - git
  - hooks
  - init
  - harness
id: REQ-kibi-first-use-auto-compile
type: req
---
Kibi must compile a never-compiled branch store on first use without writing any file Git tracks, unless auto-sync is turned off.

## Context

A fresh clone has no compiled branch store, so the first Kibi command compiles one.

A clone carries the `.kb/` knowledge but never `.git/hooks`, the compiled branch store or a per-user plugin, so an agent working in a fresh clone or a cloud session got no commit gate, empty query answers and nothing telling it the knowledge base existed, and ignored Kibi. The maintainer expected an initialized repository to work everywhere, and asked for setup that is as automatic as possible without breaking anyone's workflow or CI, with the choices asked once during onboarding or migration. The CI gate stays off by default for that reason; the other choices default on and each has an opt-out.

## Why this changed

Split from REQ-kibi-fresh-clone-setup, which held three behaviors: what kibi init records, how Kibi compiles a never-compiled store on first use, and how harness plugins report missing hooks. Each child is one of them.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
