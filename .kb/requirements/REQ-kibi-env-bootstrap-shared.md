---
title: CLI and MCP share one environment bootstrap with a fixed source order
status: open
semantic_text: Kibi CLI and MCP must share one harness-independent environment bootstrap. Non-empty process environment values win over project `.env.kibi` or `KIBI_ENV_FILE`, which win over user `~/.config/kibi/env`, which win over legacy `.env` gap-fill. Blank values are unset and must not overwrite. Bootstrap source labels are process, project_env, user_env, legacy_env, or missing, and must never include secret values. Legacy env sources must be labeled legacy_env with a migration hint.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1b8869675274fea7defc53cd3e6fc100c51d3499f6b35b6f4ffeead5228a2841
semantic_inventory:
  - claim_key: CLAIM-3B00C14EE898530D
    claim_text: Kibi CLI and MCP must share one harness-independent environment bootstrap
    role: normative
    status: modeled
    span:
      start: 0
      end: 73
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-SHARED
  - claim_key: CLAIM-9F67B4E7EF5AA95B
    claim_text: Non-empty process environment values win over project `.env.kibi` or `KIBI_ENV_FILE`, which win over user `~/.config/kibi/env`, which win over legacy `.env` gap-fill
    role: descriptive
    status: modeled
    span:
      start: 75
      end: 240
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-PRECEDENCE
  - claim_key: CLAIM-98BEE3359E84D72E
    claim_text: Blank values are unset and must not overwrite
    role: normative
    status: modeled
    span:
      start: 242
      end: 287
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-BLANK
  - claim_key: CLAIM-65CFF32C6CEA6DF6
    claim_text: Bootstrap source labels are process, project_env, user_env, legacy_env, or missing, and must never include secret values
    role: normative
    status: modeled
    span:
      start: 289
      end: 409
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-SOURCE-LABELS
  - claim_key: CLAIM-6FEBDD5BAC05A477
    claim_text: Legacy env sources must be labeled legacy_env with a migration hint
    role: normative
    status: modeled
    span:
      start: 411
      end: 478
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-LEGACY-LABEL
logic_claims:
  - CLAIM-3B00C14EE898530D
  - CLAIM-9F67B4E7EF5AA95B
  - CLAIM-98BEE3359E84D72E
  - CLAIM-65CFF32C6CEA6DF6
  - CLAIM-6FEBDD5BAC05A477
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T15:03:55.760Z'
firmness: default
required_evidence: tested
tags:
  - env
  - bootstrap
  - doctor
  - cli
  - mcp
id: REQ-kibi-env-bootstrap-shared
type: req
---
Kibi CLI and MCP must share one harness-independent environment bootstrap. Non-empty process environment values win over project `.env.kibi` or `KIBI_ENV_FILE`, which win over user `~/.config/kibi/env`, which win over legacy `.env` gap-fill. Blank values are unset and must not overwrite. Bootstrap source labels are process, project_env, user_env, legacy_env, or missing, and must never include secret values. Legacy env sources must be labeled legacy_env with a migration hint.

## Context

bootstrapKibiEnvironment in packages/cli/src/env/bootstrap.ts loads the sources in order and records their labels; MCP finds the project env file with resolveEnvFilePath.



## Why this changed

Split from REQ-kibi-env-bootstrap by behavior: the shared bootstrap and its source order, workspace root resolution, and doctor attribution. Each child is owned by the functions that decide it, and keeps the parent's wording.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
