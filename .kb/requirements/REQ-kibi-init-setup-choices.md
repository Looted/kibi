---
title: kibi init records setup choices, agent instructions and the prepare step
status: open
semantic_text: The `kibi init` command must record four setup choices (autoSync, prepareHooks, agentInstructions, ciGate) in the repository. The `kibi init` command must write a marker-delimited Kibi section into AGENTS.md when agentInstructions is on. The `kibi init` command must add a package.json prepare step that installs Kibi's Git hooks when prepareHooks is on, unless a hook manager owns the hooks.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 59e190fbf0a06d92b5d12c2d066d4701ad11a1b803457bdbc764dc58155569b9
semantic_inventory:
  - claim_key: CLAIM-4B22B74393700AB6
    claim_text: The `kibi init` command must record four setup choices (autoSync, prepareHooks, agentInstructions, ciGate) in the repository
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-3D7E7357520EB243
    claim_text: The `kibi init` command must write a marker-delimited Kibi section into AGENTS.md when agentInstructions is on
    role: normative
    status: modeled
    span:
      start: 126
      end: 236
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-BC78880CDC1510BE
    claim_text: The `kibi init` command must add a package.json prepare step that installs Kibi's Git hooks when prepareHooks is on, unless a hook manager owns the hooks
    role: exception
    status: modeled
    span:
      start: 238
      end: 391
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4B22B74393700AB6
  - CLAIM-3D7E7357520EB243
  - CLAIM-BC78880CDC1510BE
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:15:37.837Z'
priority: must
firmness: firm
tags:
  - git
  - hooks
  - init
  - harness
id: REQ-kibi-init-setup-choices
type: req
---
The `kibi init` command must record four setup choices (autoSync, prepareHooks, agentInstructions, ciGate) in the repository. The `kibi init` command must write a marker-delimited Kibi section into AGENTS.md when agentInstructions is on. The `kibi init` command must add a package.json prepare step that installs Kibi's Git hooks when prepareHooks is on, unless a hook manager owns the hooks.

## Context

kibi init writes the setup choices, the managed AGENTS.md section and the prepare step.

A clone carries the `.kb/` knowledge but never `.git/hooks`, the compiled branch store or a per-user plugin, so an agent working in a fresh clone or a cloud session got no commit gate, empty query answers and nothing telling it the knowledge base existed, and ignored Kibi. The maintainer expected an initialized repository to work everywhere, and asked for setup that is as automatic as possible without breaking anyone's workflow or CI, with the choices asked once during onboarding or migration. The CI gate stays off by default for that reason; the other choices default on and each has an opt-out.

## Why this changed

Split from REQ-kibi-fresh-clone-setup, which held three behaviors: what kibi init records, how Kibi compiles a never-compiled store on first use, and how harness plugins report missing hooks. Each child is one of them.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
