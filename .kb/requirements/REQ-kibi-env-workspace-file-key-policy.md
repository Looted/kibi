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
semantic_text: The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting. The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD. The project env file and the legacy .env file must not set a provider endpoint such as TYPESAFE_BASE_URL. Kibi must name the ignored Kibi and process keys on stderr without their values. The user env file and the process environment stay unrestricted.
semantic_clauses:
  - The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting.
  - The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD.
  - The project env file and the legacy .env file must not set a provider endpoint such as TYPESAFE_BASE_URL.
  - Kibi must name the ignored Kibi and process keys on stderr without their values.
  - The user env file and the process environment stay unrestricted.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Security fix, 2026-11-16: a committed .env.kibi or .env could set KIBI_NODE_PATH and make the next engine command run a file of the repository''s choosing. Pre-release review, 2026-11-18: a committed .env.kibi could set TYPESAFE_BASE_URL and receive the API key kept in the user env file. Maintainer-approved statement (2026-11-18, "Approve all"): "The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting. The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD. The project env file and the legacy .env file must not set a provider endpoint such as TYPESAFE_BASE_URL. Kibi must name the ignored Kibi and process keys on stderr without their values. The user env file and the process environment stay unrestricted."'
  recorded_at: '2026-11-16T20:52:57.284Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 93a7a3afc27871ebffecd38b489daa3c3e18392e644ac44959d5e2a018dfe8d4
semantic_inventory:
  - claim_key: CLAIM-D71D35A9A11B3A91
    claim_text: The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
  - claim_key: CLAIM-60D2681BD0D753C4
    claim_text: The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD
    role: normative
    status: modeled
    span:
      start: 112
      end: 236
  - claim_key: CLAIM-34729067AE62B473
    claim_text: The project env file and the legacy .env file must not set a provider endpoint such as TYPESAFE_BASE_URL
    role: normative
    status: modeled
    span:
      start: 238
      end: 342
  - claim_key: CLAIM-C2A4743BD142E92A
    claim_text: Kibi must name the ignored Kibi and process keys on stderr without their values
    role: normative
    status: modeled
    span:
      start: 344
      end: 423
  - claim_key: CLAIM-C98991AF0ECC5CE4
    claim_text: The user env file and the process environment stay unrestricted
    role: descriptive
    status: modeled
    span:
      start: 425
      end: 488
logic_claims:
  - CLAIM-D71D35A9A11B3A91
  - CLAIM-60D2681BD0D753C4
  - CLAIM-34729067AE62B473
  - CLAIM-C2A4743BD142E92A
  - CLAIM-C98991AF0ECC5CE4
id: REQ-kibi-env-workspace-file-key-policy
type: req
---
The project env file and the legacy .env file must not set a KIBI_ key other than a KIBI_JEV_ provider setting. The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD. The project env file and the legacy .env file must not set a provider endpoint such as TYPESAFE_BASE_URL. Kibi must name the ignored Kibi and process keys on stderr without their values. The user env file and the process environment stay unrestricted.

## Context

Source: a security review of the env bootstrap on 2026-11-16. `bootstrapKibiEnvironment` copied every key from the project `.env.kibi` (or the `KIBI_ENV_FILE` target) and the legacy `.env` into the process environment. Those files come with the checkout, so a cloned repository could commit `KIBI_NODE_PATH=./evil.sh` and the next engine-backed command spawned that file as the engine daemon. The same route set `KIBI_KB_PL_PATH`, `KIBI_<MODULE>_PATH`, `KIBI_RUNTIME_DIR` and process variables such as `NODE_OPTIONS` or `LD_PRELOAD`.

The documented purpose of the workspace files is provider secrets and provider settings (`TYPESAFE_API_KEY`, `KIBI_JEV_MODEL`, `KIBI_JEV_TIMEOUT_MS`). The policy is `isWorkspaceEnvKeyAllowed` in `packages/cli/src/env/workspace-env-policy.ts`: deny by default inside `KIBI_` except the `KIBI_JEV_` prefix; outside it, only keys shaped like a provider secret or setting (`WORKSPACE_PROVIDER_KEY`, such as `*_API_KEY`, `*_TOKEN`, `*_MODEL`) pass, and never a name from the denylist of process-variable names and families, matched in any letter case. A pre-release review on 2026-11-17 found that a denylist alone let `OPENSSL_CONF` load code into the engine daemon, so the side outside `KIBI_` became an allow-list too. CLI and MCP share it through the one bootstrap (REQ-kibi-env-bootstrap-shared). The maintainer approved the wording on 2026-11-17.

A second pre-release review on 2026-11-18 found that the allow-list still admitted endpoints (`*_URL`, `*_ENDPOINT`): a committed `.env.kibi` could set `TYPESAFE_BASE_URL`, and the provider SDK then sent the API key the user keeps in `~/.config/kibi/env` to the repository's server. Endpoints no longer pass. The same review found that the notice printed fragments of secret values (each line of a multi-line quoted PEM key read as a key) and named every setting of an ordinary application `.env` on every run. Quoted values now span lines, a line that is not a conventional variable name is counted and never printed, and a legacy `.env` names only the Kibi and process keys it tries to set.
