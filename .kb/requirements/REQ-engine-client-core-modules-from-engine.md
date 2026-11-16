---
title: Engine clients load core modules from the core the engine runs
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - engine
  - daemon
  - prolog
semantic_text: A Kibi client must load Prolog core modules from the core the engine it talks to already runs, so a client from another install of the same release never fails because a core module is already loaded from a different file.
rationale: Two installs of one Kibi release, such as a project-local install and a source checkout built at the release commit, report the same package versions and core-source digest, so one engine daemon serves both; a client that asked the daemon to load its own copy of a core module was refused by SWI-Prolog, and every kb_check failed.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the engine module-loading fix statements: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T09:59:42.480Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 114af959cfa8074b9f31444e96d5f9e55fd42b2f20be4a30e57285fc1f215556
semantic_inventory:
  - claim_key: CLAIM-F57649C5EF6C2129
    claim_text: A Kibi client must load Prolog core modules from the core the engine it talks to already runs, so a client from another install of the same release never fails because a core module is already loaded from a different file
    role: normative
    status: modeled
    span:
      start: 0
      end: 221
logic_claims:
  - CLAIM-F57649C5EF6C2129
id: REQ-engine-client-core-modules-from-engine
type: req
---
A Kibi client must load Prolog core modules from the core the engine it talks to already runs, so a client from another install of the same release never fails because a core module is already loaded from a different file.

## Context

The engine daemon is keyed by workspace and branch and serves every client whose package versions, core-source digest and SWI-Prolog match. Two installs of one release match on all three while their core files live in different directories. A client sent use_module with its own absolute path, which loaded a second copy of a module the daemon had already loaded, and SWI-Prolog raised permission_error(redefine, module, ...). Kibi showed that as "Access denied or KB locked", so kb_check failed on every call in that workspace. Clients now ask the daemon to load the module of the same name next to its own kb.pl.

## Source

> Maintainer decision, 2026-11-16, approving the engine module-loading fix statements: "Approve all"