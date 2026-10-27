---
title: 'Claude Code Kibi Plugin v1: progressive-disclosure knowledge hooks'
status: open
priority: must
tags:
  - claude-code
  - plugin
  - hooks
  - progressive-disclosure
  - review:context-missing
semantic_text: The kibi-claude package must remain optional. When kibi-claude is installed or enabled, it must not modify core Kibi runtime components. When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools. When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context. kibi-claude hooks must add at most one knowledge snippet per file per session. When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine. When a kibi-claude hook runs, it must not deny a tool call. At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check. Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call.
logic_claims:
  - CLAIM-94B3A133D10BFB98
  - CLAIM-33E4D5BB01AD55FF
  - CLAIM-B0C7CD09A216CE9D
  - CLAIM-882BAB3F3C3572F9
  - CLAIM-86B85730B99AF0C9
  - CLAIM-B8B9B523CCC37CE5
  - CLAIM-7B062DA2D111C910
  - CLAIM-EB2FC292489174F2
  - CLAIM-6BD137F24FF5D674
  - CLAIM-4107EC64A4208A83
semantic_inventory:
  - claim_key: CLAIM-94B3A133D10BFB98
    claim_text: The kibi-claude package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 44
  - claim_key: CLAIM-33E4D5BB01AD55FF
    claim_text: When kibi-claude is installed or enabled, it must not modify core Kibi runtime components
    role: condition
    status: modeled
    span:
      start: 46
      end: 135
  - claim_key: CLAIM-B0C7CD09A216CE9D
    claim_text: When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output
    role: condition
    status: modeled
    span:
      start: 137
      end: 237
  - claim_key: CLAIM-882BAB3F3C3572F9
    claim_text: When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools
    role: condition
    status: modeled
    span:
      start: 239
      end: 351
  - claim_key: CLAIM-86B85730B99AF0C9
    claim_text: When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context
    role: condition
    status: modeled
    span:
      start: 353
      end: 531
  - claim_key: CLAIM-B8B9B523CCC37CE5
    claim_text: kibi-claude hooks must add at most one knowledge snippet per file per session
    role: normative
    status: modeled
    span:
      start: 533
      end: 610
  - claim_key: CLAIM-7B062DA2D111C910
    claim_text: When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine
    role: condition
    status: modeled
    span:
      start: 612
      end: 692
  - claim_key: CLAIM-EB2FC292489174F2
    claim_text: When a kibi-claude hook runs, it must not deny a tool call
    role: condition
    status: modeled
    span:
      start: 694
      end: 752
  - claim_key: CLAIM-6BD137F24FF5D674
    claim_text: At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check
    role: normative
    status: modeled
    span:
      start: 754
      end: 885
  - claim_key: CLAIM-4107EC64A4208A83
    claim_text: Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call
    role: normative
    status: modeled
    span:
      start: 887
      end: 1021
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6f145e88646a34e9a35f2145813910304b4cbcc551b69c593b79373d84ae4b60
semantic_clauses:
  - The kibi-claude package must remain optional.
  - When kibi-claude is installed or enabled, it must not modify core Kibi runtime components.
  - When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output.
  - When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools.
  - When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context.
  - kibi-claude hooks must add at most one knowledge snippet per file per session.
  - When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine.
  - When a kibi-claude hook runs, it must not deny a tool call.
  - At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check.
  - Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call.
id: REQ-claude-code-kibi-plugin-v1
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:42:54.389Z'
firmness: firm
---
The kibi-claude package must remain optional. When kibi-claude is installed or enabled, it must not modify core Kibi runtime components. When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools. When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context. kibi-claude hooks must add at most one knowledge snippet per file per session. When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine. When a kibi-claude hook runs, it must not deny a tool call. At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check. Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call.

## Context

What the kibi-claude package ships (its manifest, skills, MCP configuration and lifecycle hooks) is stated in REQ-claude-plugin-package, where each claim is proved from the package files. This requirement keeps the runtime behaviour of the hooks and the MCP endpoint.

## Why this changed

The maintainer decided on 2026-10-14 that the hooks should stop an agent before it changes code a firm requirement governs, not only describe the requirement. Asking the person to confirm the edit keeps the hooks from denying any call while putting the decision to the person at the moment the code would change.

The packaging claims moved to REQ-claude-plugin-package on 2026-10-27 so that each one can be proved from the files the package publishes.
