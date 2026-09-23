---
title: Harness-independent Kibi environment bootstrap
status: open
tags:
  - env
  - bootstrap
  - doctor
  - cli
  - mcp
semantic_text: Kibi CLI and MCP must share one harness-independent environment bootstrap. Non-empty process environment values win over project `.env.kibi` or `KIBI_ENV_FILE`, which win over user `~/.config/kibi/env`, which win over legacy `.env` gap-fill. Blank values are unset and must not overwrite. Workspace resolution for env files and doctor plugin configuration must use resolveKibiWorkspaceRoot, and MCP resolveWorkspaceRoot must delegate to it. Bootstrap source labels are process, project_env, user_env, legacy_env, or missing, and must never include secret values. Doctor secret attribution must use the actual bootstrap sources with remembered pre-bootstrap process keys. Doctor must report capability plugin package, capability, mode, and declared dependency without importing plugin packages; first-party Jev secret and model diagnostics may be static. Legacy env sources must be labeled legacy_env with a migration hint.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4b3d095358dae9b83050fa3e56fdf6649d09bc2058aff476602c3ed56e669a4e
semantic_inventory:
  - claim_key: CLAIM-3B00C14EE898530D
    claim_text: Kibi CLI and MCP must share one harness-independent environment bootstrap
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 73
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-9F67B4E7EF5AA95B
    claim_text: Non-empty process environment values win over project `.env.kibi` or `KIBI_ENV_FILE`, which win over user `~/.config/kibi/env`, which win over legacy `.env` gap-fill
    role: descriptive
    status: ambiguous
    span:
      start: 75
      end: 240
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-98BEE3359E84D72E
    claim_text: Blank values are unset and must not overwrite
    role: normative
    status: ontology_gap
    span:
      start: 242
      end: 287
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-84CBFD93350DABA2
    claim_text: Workspace resolution for env files and doctor plugin configuration must use resolveKibiWorkspaceRoot, and MCP resolveWorkspaceRoot must delegate to it
    role: normative
    status: ontology_gap
    span:
      start: 289
      end: 439
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-65CFF32C6CEA6DF6
    claim_text: Bootstrap source labels are process, project_env, user_env, legacy_env, or missing, and must never include secret values
    role: normative
    status: ontology_gap
    span:
      start: 441
      end: 561
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-987CF003A78B4146
    claim_text: Doctor secret attribution must use the actual bootstrap sources with remembered pre-bootstrap process keys
    role: normative
    status: ontology_gap
    span:
      start: 563
      end: 669
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-DFCDB5277B07B761
    claim_text: Doctor must report capability plugin package, capability, mode, and declared dependency without importing plugin packages
    role: normative
    status: ontology_gap
    span:
      start: 671
      end: 792
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-046E0B392D44C46E
    claim_text: first-party Jev secret and model diagnostics may be static
    role: descriptive
    status: ambiguous
    span:
      start: 794
      end: 852
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-6FEBDD5BAC05A477
    claim_text: Legacy env sources must be labeled legacy_env with a migration hint
    role: normative
    status: ontology_gap
    span:
      start: 854
      end: 921
    payload_hash: e5ec36955ded5bdfe5946bf3a732c42ef5f3e59b8ec7c7e306aa2cdc49c9fb84
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-3B00C14EE898530D
  - CLAIM-9F67B4E7EF5AA95B
  - CLAIM-98BEE3359E84D72E
  - CLAIM-84CBFD93350DABA2
  - CLAIM-65CFF32C6CEA6DF6
  - CLAIM-987CF003A78B4146
  - CLAIM-DFCDB5277B07B761
  - CLAIM-046E0B392D44C46E
  - CLAIM-6FEBDD5BAC05A477
id: REQ-kibi-env-bootstrap
type: req
---
# REQ-kibi-env-bootstrap

## Intent

Kibi CLI and MCP share one harness-independent environment bootstrap so provider secrets and settings resolve the same way in every host.

## Normative claims

See semantic_text / inventory.


Kibi CLI and MCP must share one harness-independent environment bootstrap. Non-empty process environment values win over project `.env.kibi` or `KIBI_ENV_FILE`, which win over user `~/.config/kibi/env`, which win over legacy `.env` gap-fill. Blank values are unset and must not overwrite. Workspace resolution for env files and doctor plugin configuration must use resolveKibiWorkspaceRoot, and MCP resolveWorkspaceRoot must delegate to it. Bootstrap source labels are process, project_env, user_env, legacy_env, or missing, and must never include secret values. Doctor secret attribution must use the actual bootstrap sources with remembered pre-bootstrap process keys. Doctor must report capability plugin package, capability, mode, and declared dependency without importing plugin packages; first-party Jev secret and model diagnostics may be static. Legacy env sources must be labeled legacy_env with a migration hint.
