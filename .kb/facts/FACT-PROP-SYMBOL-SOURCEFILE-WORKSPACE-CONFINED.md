---
title: Workspace Confined = true
status: active
tags:
  - security
  - symbols
  - lane:strict
fact_kind: property_value
subject_key: symbol.source_file
property_key: workspace_confined
operator: eq
value_type: bool
value_bool: true
canonical_key: symbol.source_file:workspace_confined:bool:true
claim_key: CLAIM-7A590145B64A85FE
claim_text: Symbol sourceFile values must be workspace-relative paths. Coordinate refresh and related source reads must resolve paths under the workspace root only and must refuse absolute paths, .. escapes, and symlink targets outside the workspace so they cannot be used as an outside-file existence or substring oracle.
id: FACT-PROP-SYMBOL-SOURCEFILE-WORKSPACE-CONFINED
type: fact
---
