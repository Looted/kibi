---
title: Harness plugins report missing Kibi Git hooks at session start
status: open
semantic_text: Kibi's harness plugins must tell the agent at session start when Kibi's Git hooks are missing from the checkout.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2eadf81ab1530efe37105d238aee0eaf701c1629cb63101cfaa9eb7fffaf7c37
semantic_inventory:
  - claim_key: CLAIM-4DDE018E0A6BF11D
    claim_text: Kibi's harness plugins must tell the agent at session start when Kibi's Git hooks are missing from the checkout
    role: normative
    status: modeled
    span:
      start: 0
      end: 111
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4DDE018E0A6BF11D
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:16:45.203Z'
priority: must
firmness: firm
tags:
  - git
  - hooks
  - init
  - harness
id: REQ-kibi-missing-hooks-notice
type: req
---
Kibi's harness plugins must tell the agent at session start when Kibi's Git hooks are missing from the checkout.

## Context

A fresh clone has no Git hooks until the prepare step or kibi hooks install runs, so the harness plugins say so at session start.

A clone carries the `.kb/` knowledge but never `.git/hooks`, the compiled branch store or a per-user plugin, so an agent working in a fresh clone or a cloud session got no commit gate, empty query answers and nothing telling it the knowledge base existed, and ignored Kibi. The maintainer expected an initialized repository to work everywhere, and asked for setup that is as automatic as possible without breaking anyone's workflow or CI, with the choices asked once during onboarding or migration. The CI gate stays off by default for that reason; the other choices default on and each has an opt-out.

## Why this changed

Split from REQ-kibi-fresh-clone-setup, which held three behaviors: what kibi init records, how Kibi compiles a never-compiled store on first use, and how harness plugins report missing hooks. Each child is one of them.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
