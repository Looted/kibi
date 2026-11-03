---
title: A fresh clone uses Kibi without running kibi init
status: open
priority: must
firmness: firm
tags:
  - git
  - hooks
  - init
  - harness
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30: "I assumed that once initialized, kibi does work everywhere?"; decision 2026-11-03: "making kibi as automated as possible, but I don''t want to break peoples flow (or break their CI)".'
  approved_by: maintainer
  recorded_at: '2026-11-03T15:26:28.248Z'
semantic_text: The `kibi init` command must record four setup choices (autoSync, prepareHooks, agentInstructions, ciGate) in the repository. The `kibi init` command must write a marker-delimited Kibi section into AGENTS.md when agentInstructions is on. The `kibi init` command must add a package.json prepare step that installs Kibi's Git hooks when prepareHooks is on, unless a hook manager owns the hooks. Kibi must compile a never-compiled branch store on first use without writing any file Git tracks, unless auto-sync is turned off. Every supported harness must tell the agent at session start when Kibi's Git hooks are missing from the checkout.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 51e134a6901eb91b29b05dfa097f173947cc58a68f074be202534cbb2837fa6b
semantic_inventory:
  - claim_key: CLAIM-4B22B74393700AB6
    claim_text: The `kibi init` command must record four setup choices (autoSync, prepareHooks, agentInstructions, ciGate) in the repository
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
  - claim_key: CLAIM-3D7E7357520EB243
    claim_text: The `kibi init` command must write a marker-delimited Kibi section into AGENTS.md when agentInstructions is on
    role: normative
    status: modeled
    span:
      start: 126
      end: 236
  - claim_key: CLAIM-BC78880CDC1510BE
    claim_text: The `kibi init` command must add a package.json prepare step that installs Kibi's Git hooks when prepareHooks is on, unless a hook manager owns the hooks
    role: exception
    status: modeled
    span:
      start: 238
      end: 391
  - claim_key: CLAIM-9257D259BEE7DE86
    claim_text: Kibi must compile a never-compiled branch store on first use without writing any file Git tracks, unless auto-sync is turned off
    role: exception
    status: modeled
    span:
      start: 393
      end: 521
  - claim_key: CLAIM-8305FD6DAE83107E
    claim_text: Every supported harness must tell the agent at session start when Kibi's Git hooks are missing from the checkout
    role: normative
    status: modeled
    span:
      start: 523
      end: 635
logic_claims:
  - CLAIM-4B22B74393700AB6
  - CLAIM-3D7E7357520EB243
  - CLAIM-BC78880CDC1510BE
  - CLAIM-9257D259BEE7DE86
  - CLAIM-8305FD6DAE83107E
id: REQ-kibi-fresh-clone-setup
type: req
---
The `kibi init` command must record four setup choices (autoSync, prepareHooks, agentInstructions, ciGate) in the repository. The `kibi init` command must write a marker-delimited Kibi section into AGENTS.md when agentInstructions is on. The `kibi init` command must add a package.json prepare step that installs Kibi's Git hooks when prepareHooks is on, unless a hook manager owns the hooks. Kibi must compile a never-compiled branch store on first use without writing any file Git tracks, unless auto-sync is turned off. Every supported harness must tell the agent at session start when Kibi's Git hooks are missing from the checkout.

## Context

A clone carries the `.kb/` knowledge but never `.git/hooks`, the compiled branch store or a per-user plugin, so an agent working in a fresh clone or a cloud session got no commit gate, empty query answers and nothing telling it the knowledge base existed, and ignored Kibi. The maintainer expected an initialized repository to work everywhere, and asked for setup that is as automatic as possible without breaking anyone's workflow or CI, with the choices asked once during onboarding or migration. The CI gate stays off by default for that reason; the other choices default on and each has an opt-out.

## Source

Maintainer request, 2026-10-30:

> I just had a case where an agent cloned a repo, and since git hooks didn't carry over, it simply ignored Kibi. [...] However I assumed that once initialized, kibi does work everywhere?

Maintainer decision, 2026-11-03:

> I'm generally for making kibi as automated as possible, but I don't want to break peoples flow (or break their CI). Agent could ask the questions during onboarding (or migrating) and let the user choose.
