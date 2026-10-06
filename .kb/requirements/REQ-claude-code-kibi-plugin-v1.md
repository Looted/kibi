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
semantic_text: |-
  The kibi-claude package must remain optional.

  When kibi-claude is installed or enabled, it must not modify core Kibi runtime components.

  When kibi-claude is enabled, it must expose a Claude Code plugin manifest.

  When kibi-claude is enabled, it must expose bundled Kibi skills.

  When kibi-claude is enabled, it must expose an MCP configuration.

  When kibi-claude is enabled, it must expose advisory lifecycle hooks.

  When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output.

  When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools.

  When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context.

  kibi-claude hooks must add at most one knowledge snippet per file per session.

  When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine.

  When a kibi-claude hook runs, it must not deny a tool call.

  At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check.
logic_claims:
  - CLAIM-94B3A133D10BFB98
  - CLAIM-33E4D5BB01AD55FF
  - CLAIM-1B4BDC604FA68207
  - CLAIM-C7368A6EED6243C8
  - CLAIM-DEE3AAAF4BEED03E
  - CLAIM-14D90B7686DEB631
  - CLAIM-B0C7CD09A216CE9D
  - CLAIM-882BAB3F3C3572F9
  - CLAIM-86B85730B99AF0C9
  - CLAIM-B8B9B523CCC37CE5
  - CLAIM-7B062DA2D111C910
  - CLAIM-EB2FC292489174F2
  - CLAIM-6BD137F24FF5D674
semantic_inventory:
  - claim_key: CLAIM-94B3A133D10BFB98
    claim_text: The kibi-claude package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 44
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-33E4D5BB01AD55FF
    claim_text: When kibi-claude is installed or enabled, it must not modify core Kibi runtime components
    role: condition
    status: modeled
    span:
      start: 47
      end: 136
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-1B4BDC604FA68207
    claim_text: When kibi-claude is enabled, it must expose a Claude Code plugin manifest
    role: condition
    status: modeled
    span:
      start: 139
      end: 212
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-C7368A6EED6243C8
    claim_text: When kibi-claude is enabled, it must expose bundled Kibi skills
    role: condition
    status: modeled
    span:
      start: 215
      end: 278
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-DEE3AAAF4BEED03E
    claim_text: When kibi-claude is enabled, it must expose an MCP configuration
    role: condition
    status: modeled
    span:
      start: 281
      end: 345
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-14D90B7686DEB631
    claim_text: When kibi-claude is enabled, it must expose advisory lifecycle hooks
    role: condition
    status: modeled
    span:
      start: 348
      end: 416
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-B0C7CD09A216CE9D
    claim_text: When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output
    role: condition
    status: modeled
    span:
      start: 419
      end: 519
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-882BAB3F3C3572F9
    claim_text: When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools
    role: condition
    status: modeled
    span:
      start: 522
      end: 634
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-86B85730B99AF0C9
    claim_text: When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context
    role: condition
    status: modeled
    span:
      start: 637
      end: 815
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-B8B9B523CCC37CE5
    claim_text: kibi-claude hooks must add at most one knowledge snippet per file per session
    role: normative
    status: modeled
    span:
      start: 818
      end: 895
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-7B062DA2D111C910
    claim_text: When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine
    role: condition
    status: modeled
    span:
      start: 898
      end: 978
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-EB2FC292489174F2
    claim_text: When a kibi-claude hook runs, it must not deny a tool call
    role: condition
    status: modeled
    span:
      start: 981
      end: 1039
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
  - claim_key: CLAIM-6BD137F24FF5D674
    claim_text: At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check
    role: normative
    status: modeled
    span:
      start: 1042
      end: 1173
    payload_hash: c9749c28760af9183536dcb790fafe4b6ff6e3f8d299164a8ec6d405d7a4b65b
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 11176943e907ebf7c2ca993735a962cbaedcd52231cf475e34982f21679f048f
semantic_clauses:
  - The kibi-claude package must remain optional
  - When kibi-claude is installed or enabled, it must not modify core Kibi runtime components
  - When kibi-claude is enabled, it must expose a Claude Code plugin manifest
  - When kibi-claude is enabled, it must expose bundled Kibi skills
  - When kibi-claude is enabled, it must expose an MCP configuration
  - When kibi-claude is enabled, it must expose advisory lifecycle hooks
  - When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output
  - When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools
  - When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context
  - kibi-claude hooks must add at most one knowledge snippet per file per session
  - When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine
  - When a kibi-claude hook runs, it must not deny a tool call
  - At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check
id: REQ-claude-code-kibi-plugin-v1
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The kibi-claude package must remain optional.

When kibi-claude is installed or enabled, it must not modify core Kibi runtime components.

When kibi-claude is enabled, it must expose a Claude Code plugin manifest.

When kibi-claude is enabled, it must expose bundled Kibi skills.

When kibi-claude is enabled, it must expose an MCP configuration.

When kibi-claude is enabled, it must expose advisory lifecycle hooks.

When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output.

When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools.

When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context.

kibi-claude hooks must add at most one knowledge snippet per file per session.

When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine.

When a kibi-claude hook runs, it must not deny a tool call.

At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check.
