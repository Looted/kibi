---
title: Env bootstrap workspace resolver
status: active
tags:
  - lane:strict
  - env
  - bootstrap
text_ref: .kb/requirements/REQ-kibi-env-bootstrap.md
fact_kind: property_value
subject_key: kibi.env_bootstrap
property_key: workspace_resolver
operator: eq
value_type: string
value_string: resolveKibiWorkspaceRoot
canonical_key: kibi.env_bootstrap:workspace_resolver:eq:resolveKibiWorkspaceRoot
claim_key: CLAIM-84CBFD93350DABA2
claim_text: Workspace resolution for env files and doctor plugin configuration must use resolveKibiWorkspaceRoot, and MCP resolveWorkspaceRoot must delegate to it
id: FACT-PROP-ENV-BOOTSTRAP-WORKSPACE
type: fact
---
