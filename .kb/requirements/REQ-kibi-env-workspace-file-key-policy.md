---
title: Workspace env files cannot set keys that change what Kibi runs or loads
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - env
  - bootstrap
  - security
  - cli
  - mcp
semantic_text: The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting. The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD. Kibi must name the ignored keys on stderr without their values. The user env file and the process environment stay unrestricted.
semantic_clauses:
  - The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting.
  - The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD.
  - Kibi must name the ignored keys on stderr without their values.
  - The user env file and the process environment stay unrestricted.
origin:
  kind: agent
  ref: 'Security fix, 2026-11-16: a committed .env.kibi or .env could set KIBI_NODE_PATH and make the next engine command run a file of the repository''s choosing. Maintainer decision, 2026-11-17, approving the statement as worded: "Approved".'
  recorded_at: '2026-11-16T20:52:57.284Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 90287ad8786a715d0eaebd07fc719db79f0e3a96d3ae9c21d314d5f73fa518e9
semantic_inventory:
  - claim_key: CLAIM-D71D35A9A11B3A91
    claim_text: The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
    reason: Grounded via FACT-env-workspace-files-non-provider-kibi-keys
  - claim_key: CLAIM-60D2681BD0D753C4
    claim_text: The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD
    role: normative
    status: modeled
    span:
      start: 112
      end: 236
    reason: Grounded via FACT-env-workspace-files-process-variables
  - claim_key: CLAIM-181C299C7D4CB168
    claim_text: Kibi must name the ignored keys on stderr without their values
    role: normative
    status: modeled
    span:
      start: 238
      end: 300
    reason: Grounded via FACT-env-workspace-files-ignored-key-report
  - claim_key: CLAIM-C98991AF0ECC5CE4
    claim_text: The user env file and the process environment stay unrestricted
    role: descriptive
    status: modeled
    span:
      start: 302
      end: 365
    reason: Grounded via FACT-env-user-and-process-env-unrestricted
logic_claims:
  - CLAIM-D71D35A9A11B3A91
  - CLAIM-60D2681BD0D753C4
  - CLAIM-181C299C7D4CB168
  - CLAIM-C98991AF0ECC5CE4
id: REQ-kibi-env-workspace-file-key-policy
type: req
---
## Context

Source: a security review of the env bootstrap on 2026-11-16. `bootstrapKibiEnvironment` copied every key from the project `.env.kibi` (or the `KIBI_ENV_FILE` target) and the legacy `.env` into the process environment. Those files come with the checkout, so a cloned repository could commit `KIBI_NODE_PATH=./evil.sh` and the next engine-backed command spawned that file as the engine daemon. The same route set `KIBI_KB_PL_PATH`, `KIBI_<MODULE>_PATH`, `KIBI_RUNTIME_DIR` and process variables such as `NODE_OPTIONS` or `LD_PRELOAD`.

The documented purpose of the workspace files is provider secrets and provider settings (`TYPESAFE_API_KEY`, `KIBI_JEV_MODEL`, `KIBI_JEV_TIMEOUT_MS`). The policy is `isWorkspaceEnvKeyAllowed` in `packages/cli/src/env/workspace-env-policy.ts`: deny by default inside `KIBI_` except the `KIBI_JEV_` prefix, and a denylist of process-variable names and families matched in any letter case. CLI and MCP share it through the one bootstrap (REQ-kibi-env-bootstrap-shared). The maintainer approved the wording on 2026-11-17.
